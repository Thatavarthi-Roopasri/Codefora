const MAX_PROJECT_TITLE_LENGTH = 80;
const MAX_PROJECT_SNAPSHOT_BYTES = 700_000;
const MAX_FILE_BYTES = 200_000;

function normalizeTitle(value, fallback) {
  const title = String(value || '').trim().replace(/\s+/g, ' ');
  return (title || fallback || 'Untitled room project').slice(0, MAX_PROJECT_TITLE_LENGTH);
}

function projectSummary(project) {
  return {
    id: project.id,
    ownerId: project.ownerId,
    title: project.title,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    completedAt: project.completedAt || null,
    checkpointCount: project.checkpointCount || 0,
    workId: project.workId || null,
  };
}

function collabDocName(roomId, fileName) {
  return `yjs/room-${roomId}-file-${fileName.replace(/[^a-zA-Z0-9-.]/g, '')}`;
}

function normalizeSnapshotFiles(files) {
  if (!Array.isArray(files)) return [];

  return files
    .slice(0, 8)
    .map((file) => {
      const name = String(file?.name || '').trim().replace(/[\\/]/g, '');
      const code = String(file?.code || '');
      if (!name || Buffer.byteLength(code, 'utf8') > MAX_FILE_BYTES) return null;
      return {
        name,
        language: String(file?.language || '').trim() || 'javascript',
        code,
      };
    })
    .filter(Boolean);
}

function normalizeSnapshotNotes(notes) {
  return {
    text: String(notes?.text || '').slice(0, 10000),
    draws: Array.isArray(notes?.draws) ? notes.draws.slice(-2000) : [],
  };
}

function createProjectWork(room, project) {
  const roomName = normalizeTitle(room.name, project.title);
  return {
    // Keep the profile work record stable so later checkpoints update it.
    id: project.workId || `room-project:${room.id}`,
    name: roomName,
    roomName,
    type: 'room-project',
    originRoomId: room.id,
    roomId: room.id,
    projectStatus: project.status,
    readOnly: project.status === 'completed',
    projectId: project.id,
    files: structuredClone(room.files || []),
    notes: structuredClone(room.notes || { text: '', draws: [] }),
    problemId: room.problemId || null,
    activeFile: project.activeFile || null,
    checkpointCount: project.checkpointCount || 0,
    completedAt: project.completedAt || null,
  };
}

function assertSnapshotFitsStorage(room) {
  const snapshot = JSON.stringify({ files: room.files || [], notes: room.notes || {} });
  if (Buffer.byteLength(snapshot, 'utf8') > MAX_PROJECT_SNAPSHOT_BYTES) {
    const error = new Error('This room project is too large to save as one profile snapshot. Remove unused files or shorten large files, then try again.');
    error.statusCode = 413;
    throw error;
  }
}

function assertProjectOwner(room, userId) {
  if (!room?.ownerUserId || room.ownerUserId !== userId) {
    const error = new Error('Only the room owner can manage this project.');
    error.statusCode = 403;
    throw error;
  }
}

export function createRoomProjectController({ roomRepository, roomService = null, profileController, collabDocs = null }) {
  async function findOwnedRoom(request) {
    const room = await roomRepository.fetchById(request.params.id);
    assertProjectOwner(room, request.firebaseUser?.uid);
    return room;
  }

  async function persistProject(room, title, activeFile, status = 'active', snapshot = {}) {
    const snapshotFiles = normalizeSnapshotFiles(snapshot.files);
    if (snapshotFiles.length) room.files = snapshotFiles;
    if (snapshot.notes) room.notes = normalizeSnapshotNotes(snapshot.notes);

    assertSnapshotFitsStorage(room);
    const now = Date.now();
    const existing = room.project || {};
    const roomTitle = normalizeTitle(room.name, title || existing.title || 'Untitled room project');
    const project = {
      id: existing.id || `project-${room.id}`,
      ownerId: room.ownerUserId,
      title: roomTitle,
      status,
      createdAt: existing.createdAt || now,
      updatedAt: now,
      completedAt: status === 'completed' ? now : null,
      activeFile: String(activeFile || existing.activeFile || '').trim() || null,
      checkpointCount: (Number(existing.checkpointCount) || 0) + 1,
    };

    room.project = project;
    room.isProject = true;
    room.archivedAt = status === 'completed' ? now : null;

    await roomRepository.save(room);
    const work = await profileController.saveWorkForUser(room.ownerUserId, createProjectWork(room, project));
    room.project.workId = work.id;
    await roomRepository.save(room);

    return { project: projectSummary(room.project), work };
  }

  function refreshCollaborationDocs(room) {
    if (!collabDocs || typeof collabDocs.get !== 'function') return;

    for (const file of room.files || []) {
      const doc = collabDocs.get(collabDocName(room.id, file.name));
      if (!doc) continue;
      const type = doc.getText("monaco");
      type.delete(0, type.length);
      if (file.code) type.insert(0, file.code);
    }
  }

  return {
    save: async (request, response) => {
      try {
        const room = await findOwnedRoom(request);
        if (room.project?.status === 'completed') {
          return response.status(409).json({ error: 'This project has already ended and is read-only.' });
        }

        const result = await persistProject(room, request.body?.title, request.body?.activeFile, 'active', {
          files: request.body?.files,
          notes: request.body?.notes,
        });
        return response.json({ ok: true, ...result });
      } catch (error) {
        return response.status(error.statusCode || 500).json({ error: error.message || 'Could not save room project.' });
      }
    },

    end: async (request, response) => {
      try {
        const room = await findOwnedRoom(request);
        if (room.project?.status === 'completed') {
          return response.json({ ok: true, project: projectSummary(room.project), alreadyCompleted: true });
        }

        const result = await persistProject(room, request.body?.title, request.body?.activeFile, 'completed', {
          files: request.body?.files,
          notes: request.body?.notes,
        });
        return response.json({ ok: true, ...result });
      } catch (error) {
        return response.status(error.statusCode || 500).json({ error: error.message || 'Could not end room project.' });
      }
    },

    resume: async (request, response) => {
      try {
        const room = await findOwnedRoom(request);
        if (room.project?.status === 'completed') {
          return response.status(409).json({ error: 'This project has ended. Open a copy from your saved work instead.' });
        }

        const work = await profileController.getSavedWorkForUser(request.firebaseUser?.uid, request.body?.workId);
        if (!work || work.originRoomId !== room.id || work.type !== 'room-project') {
          return response.status(404).json({ error: 'Saved room project was not found for this user.' });
        }
        if (work.projectStatus === 'completed' || work.readOnly) {
          return response.status(409).json({ error: 'This project has ended and cannot be resumed or edited.' });
        }

        const files = normalizeSnapshotFiles(work.files);
        if (!files.length) {
          return response.status(400).json({ error: 'Saved project does not contain restorable files.' });
        }

        room.files = files;
        room.notes = normalizeSnapshotNotes(work.notes);
        room.activeFile = files.some((file) => file.name === work.activeFile) ? work.activeFile : files[0].name;
        room.problemId = work.problemId || null;
        room.isProject = true;
        room.project = {
          ...(room.project || {}),
          id: room.project?.id || work.projectId || `project-${room.id}`,
          ownerId: room.ownerUserId,
          title: normalizeTitle(work.name, room.project?.title || room.name),
          status: 'active',
          createdAt: room.project?.createdAt || work.createdAt || Date.now(),
          updatedAt: Date.now(),
          completedAt: null,
          activeFile: room.activeFile,
          checkpointCount: Math.max(Number(room.project?.checkpointCount) || 0, Number(work.checkpointCount) || 0),
          workId: work.id,
        };

        await roomRepository.save(room);
        refreshCollaborationDocs(room);

        return response.json({ ok: true, project: projectSummary(room.project), roomId: room.id, activeFile: room.activeFile });
      } catch (error) {
        return response.status(error.statusCode || 500).json({ error: error.message || 'Could not resume room project.' });
      }
    },

    reopenSavedWork: async (request, response) => {
      try {
        if (!roomService) {
          return response.status(500).json({ error: 'Room service is not available.' });
        }

        const userId = request.firebaseUser?.uid;
        const work = await profileController.getSavedWorkForUser(userId, request.params.workId);
        if (!work) {
          return response.status(404).json({ error: 'Saved work was not found for this user.' });
        }

        const files = normalizeSnapshotFiles(work.files);
        if (!files.length) {
          return response.status(400).json({ error: 'Saved project does not contain restorable files.' });
        }

        const readOnly = work.projectStatus === 'completed' || work.readOnly;
        const savedProjectName = normalizeTitle(work.roomName || work.name, 'Saved project');
        if (!readOnly && work.originRoomId && typeof roomRepository.fetchById === 'function') {
          const existingRoom = await roomRepository.fetchById(work.originRoomId);
          if (existingRoom && existingRoom.ownerUserId === userId && existingRoom.project?.status !== 'completed') {
            existingRoom.name = savedProjectName;
            existingRoom.files = files;
            existingRoom.notes = normalizeSnapshotNotes(work.notes);
            existingRoom.activeFile = files.some((file) => file.name === work.activeFile) ? work.activeFile : files[0].name;
            existingRoom.problemId = work.problemId || null;
            existingRoom.readOnly = false;
            existingRoom.isProject = true;
            existingRoom.project = {
              ...(existingRoom.project || {}),
              id: existingRoom.project?.id || work.projectId || `project-${existingRoom.id}`,
              ownerId: userId,
              title: savedProjectName,
              status: 'active',
              createdAt: existingRoom.project?.createdAt || work.createdAt || Date.now(),
              updatedAt: Date.now(),
              completedAt: null,
              activeFile: existingRoom.activeFile,
              checkpointCount: Math.max(Number(existingRoom.project?.checkpointCount) || 0, Number(work.checkpointCount) || 0),
              workId: work.id,
            };

            await roomRepository.save(existingRoom);
            refreshCollaborationDocs(existingRoom);

            return response.json({
              ok: true,
              room: { ...roomService.snapshot(existingRoom), hostToken: existingRoom.hostToken, inviteCode: existingRoom.inviteCode },
              workId: work.id,
              restoredExistingRoom: true,
            });
          }
        }

        const room = roomService.createRoom({
          name: savedProjectName,
          username: request.firebaseUser?.name || 'Host',
          userId,
          visibility: 'private',
          files,
          notes: normalizeSnapshotNotes(work.notes),
          activeFile: files.some((file) => file.name === work.activeFile) ? work.activeFile : files[0].name,
          problemId: work.problemId || null,
          readOnly,
          sourceWorkId: work.id,
          completedAt: readOnly ? (work.completedAt || Date.now()) : null,
        });

        if (work.type === 'room-project' || work.originRoomId) {
          room.isProject = true;
          room.project = {
            id: work.projectId || `project-${room.id}`,
            ownerId: userId,
            title: savedProjectName,
            status: readOnly ? 'completed' : 'active',
            createdAt: work.createdAt || Date.now(),
            updatedAt: Date.now(),
            completedAt: readOnly ? (work.completedAt || Date.now()) : null,
            activeFile: room.activeFile,
            checkpointCount: Number(work.checkpointCount) || 0,
            workId: work.id,
          };
        }

        await roomRepository.save(room);
        refreshCollaborationDocs(room);

        return response.status(201).json({
          ok: true,
          room: { ...roomService.snapshot(room), hostToken: room.hostToken, inviteCode: room.inviteCode },
          workId: work.id,
        });
      } catch (error) {
        return response.status(error.statusCode || 500).json({ error: error.message || 'Could not reopen saved work.' });
      }
    },
  };
}
