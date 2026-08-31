import assert from 'node:assert/strict';
import test from 'node:test';
import { createRoomProjectController } from '../controllers/roomProjectController.js';

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function makeRoom() {
  return {
    id: 'CF-PROJ',
    name: 'Portfolio editor',
    ownerUserId: 'host-1',
    files: [{ name: 'index.html', language: 'html', code: '<main>Ready</main>' }],
    notes: { text: 'Finish the header', draws: [] },
    users: [],
  };
}

test('room project saves a host-owned resumable work snapshot', async () => {
  const room = makeRoom();
  const savedWorks = [];
  const controller = createRoomProjectController({
    roomRepository: {
      fetchById: async () => room,
      save: async () => {},
    },
    profileController: {
      saveWorkForUser: async (userId, work) => {
        savedWorks.push({ userId, work });
        return { ...work, id: 'work-room-project' };
      },
    },
  });
  const response = makeResponse();

  await controller.save({
    params: { id: room.id },
    firebaseUser: { uid: 'host-1' },
    body: { title: 'Landing page refresh', activeFile: 'index.html' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(room.project.status, 'active');
  assert.equal(room.project.title, 'Portfolio editor');
  assert.equal(savedWorks[0].userId, 'host-1');
  assert.equal(savedWorks[0].work.type, 'room-project');
  assert.equal(savedWorks[0].work.originRoomId, room.id);
  assert.equal(savedWorks[0].work.name, room.name);
  assert.equal(savedWorks[0].work.roomName, room.name);
});

test('only the original room owner can finalize a project', async () => {
  const room = makeRoom();
  const controller = createRoomProjectController({
    roomRepository: { fetchById: async () => room, save: async () => {} },
    profileController: { saveWorkForUser: async (_userId, work) => ({ ...work, id: 'work-room-project' }) },
  });
  const denied = makeResponse();

  await controller.end({
    params: { id: room.id },
    firebaseUser: { uid: 'temporary-host' },
    body: {},
  }, denied);

  assert.equal(denied.statusCode, 403);
  assert.equal(room.project, undefined);
});

test('later checkpoints update the same saved work record', async () => {
  const room = makeRoom();
  const savedWorks = [];
  const controller = createRoomProjectController({
    roomRepository: { fetchById: async () => room, save: async () => {} },
    profileController: {
      saveWorkForUser: async (_userId, work) => {
        const saved = { ...work, id: 'work-room-project' };
        savedWorks.push(saved);
        return saved;
      },
    },
  });

  await controller.save({
    params: { id: room.id },
    firebaseUser: { uid: 'host-1' },
    body: { title: 'First checkpoint', activeFile: 'index.html' },
  }, makeResponse());

  room.files[0].code = '<main>Updated</main>';
  await controller.save({
    params: { id: room.id },
    firebaseUser: { uid: 'host-1' },
    body: { title: 'Renamed checkpoint', activeFile: 'index.html' },
  }, makeResponse());

  assert.equal(savedWorks.length, 2);
  assert.equal(savedWorks[1].id, savedWorks[0].id);
  assert.equal(savedWorks[1].name, room.name);
  assert.equal(savedWorks[1].files[0].code, '<main>Updated</main>');
});

test('room project checkpoint uses live request files when room state is stale', async () => {
  const room = makeRoom();
  room.files[0].code = '<main>Stale database copy</main>';
  const savedWorks = [];
  const controller = createRoomProjectController({
    roomRepository: { fetchById: async () => room, save: async () => {} },
    profileController: {
      saveWorkForUser: async (_userId, work) => {
        savedWorks.push(work);
        return { ...work, id: 'work-room-project' };
      },
    },
  });

  await controller.save({
    params: { id: room.id },
    firebaseUser: { uid: 'host-1' },
    body: {
      title: 'Fresh checkpoint',
      activeFile: 'index.html',
      files: [{ name: 'index.html', language: 'html', code: '<main>Visible editor copy</main>' }],
    },
  }, makeResponse());

  assert.equal(room.files[0].code, '<main>Visible editor copy</main>');
  assert.equal(savedWorks[0].files[0].code, '<main>Visible editor copy</main>');
});


test('finalizing a room project retains a completed profile snapshot', async () => {
  const room = makeRoom();
  let savedWork = null;
  const controller = createRoomProjectController({
    roomRepository: { fetchById: async () => room, save: async () => {} },
    profileController: {
      saveWorkForUser: async (_userId, work) => {
        savedWork = work;
        return { ...work, id: 'work-room-project' };
      }
    },
  });
  const response = makeResponse();

  await controller.end({
    params: { id: room.id },
    firebaseUser: { uid: 'host-1' },
    body: { activeFile: 'index.html' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(room.project.status, 'completed');
  assert.equal(savedWork.projectStatus, 'completed');
  assert.equal(savedWork.readOnly, true);
  assert.equal(savedWork.name, room.name);
  assert.equal(savedWork.roomName, room.name);
  assert.ok(room.project.completedAt);
  assert.ok(room.archivedAt);
});

test('room project rejects snapshots that exceed safe document storage limits', async () => {
  const room = makeRoom();
  room.files[0].code = 'x'.repeat(700_001);
  const controller = createRoomProjectController({
    roomRepository: { fetchById: async () => room, save: async () => {} },
    profileController: { saveWorkForUser: async (_userId, work) => ({ ...work, id: 'work-room-project' }) },
  });
  const response = makeResponse();

  await controller.save({
    params: { id: room.id },
    firebaseUser: { uid: 'host-1' },
    body: {},
  }, response);

  assert.equal(response.statusCode, 413);
  assert.match(response.body.error, /too large/i);
});

test('resuming a room project restores the owner saved snapshot into the room', async () => {
  const room = makeRoom();
  room.project = { id: 'project-CF-PROJ', ownerId: 'host-1', status: 'active', title: 'Portfolio editor' };
  room.files[0].code = '<main>Old live room</main>';
  const savedWork = {
    id: 'work-room-project',
    ownerId: 'host-1',
    type: 'room-project',
    originRoomId: room.id,
    name: 'Portfolio editor',
    activeFile: 'index.html',
    files: [{ name: 'index.html', language: 'html', code: '<main>Saved checkpoint</main>' }],
    notes: { text: 'Saved notes', draws: [] },
  };
  const savedRooms = [];
  let syncedDocText = 'stale yjs document';
  const collabDocs = new Map([['yjs/room-CF-PROJ-file-index.html', {
    getText: () => ({
      get length() {
        return syncedDocText.length;
      },
      delete: (index, length) => {
        syncedDocText = syncedDocText.slice(0, index) + syncedDocText.slice(index + length);
      },
      insert: (index, value) => {
        syncedDocText = syncedDocText.slice(0, index) + value + syncedDocText.slice(index);
      },
    }),
  }]]);
  const controller = createRoomProjectController({
    roomRepository: {
      fetchById: async () => room,
      save: async (nextRoom) => savedRooms.push(structuredClone(nextRoom)),
    },
    profileController: {
      getSavedWorkForUser: async (userId, workId) => userId === 'host-1' && workId === savedWork.id ? savedWork : null,
      saveWorkForUser: async (_userId, work) => ({ ...work, id: 'work-room-project' }),
    },
    collabDocs,
  });
  const response = makeResponse();

  await controller.resume({
    params: { id: room.id },
    firebaseUser: { uid: 'host-1' },
    body: { workId: 'work-room-project' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(room.files[0].code, '<main>Saved checkpoint</main>');
  assert.equal(room.notes.text, 'Saved notes');
  assert.equal(room.activeFile, 'index.html');
  assert.equal(room.project.workId, 'work-room-project');
  assert.equal(syncedDocText, '<main>Saved checkpoint</main>');
  assert.equal(savedRooms.length, 1);
});

test('room project resume restores the correct saved snapshot for each owner', async () => {
  const rooms = new Map([
    ['CF-USER-A', {
      ...makeRoom(),
      id: 'CF-USER-A',
      ownerUserId: 'user-a',
      files: [{ name: 'index.html', language: 'html', code: '<main>stale A</main>' }],
      project: { id: 'project-CF-USER-A', ownerId: 'user-a', status: 'active', title: 'User A project' },
    }],
    ['CF-USER-B', {
      ...makeRoom(),
      id: 'CF-USER-B',
      ownerUserId: 'user-b',
      files: [{ name: 'index.html', language: 'html', code: '<main>stale B</main>' }],
      project: { id: 'project-CF-USER-B', ownerId: 'user-b', status: 'active', title: 'User B project' },
    }],
  ]);
  const works = new Map([
    ['user-a:work-user-a', {
      id: 'work-user-a',
      ownerId: 'user-a',
      type: 'room-project',
      originRoomId: 'CF-USER-A',
      name: 'User A project',
      activeFile: 'index.html',
      files: [{ name: 'index.html', language: 'html', code: '<main>saved A only</main>' }],
      notes: { text: 'notes A', draws: [] },
    }],
    ['user-b:work-user-b', {
      id: 'work-user-b',
      ownerId: 'user-b',
      type: 'room-project',
      originRoomId: 'CF-USER-B',
      name: 'User B project',
      activeFile: 'index.html',
      files: [{ name: 'index.html', language: 'html', code: '<main>saved B only</main>' }],
      notes: { text: 'notes B', draws: [] },
    }],
  ]);
  const savedRoomIds = [];
  const controller = createRoomProjectController({
    roomRepository: {
      fetchById: async (roomId) => rooms.get(roomId),
      save: async (room) => savedRoomIds.push(room.id),
    },
    profileController: {
      getSavedWorkForUser: async (userId, workId) => works.get(`${userId}:${workId}`) || null,
      saveWorkForUser: async (_userId, work) => ({ ...work, id: work.id || 'work-room-project' }),
    },
  });

  const userAResponse = makeResponse();
  await controller.resume({
    params: { id: 'CF-USER-A' },
    firebaseUser: { uid: 'user-a' },
    body: { workId: 'work-user-a' },
  }, userAResponse);

  const userBResponse = makeResponse();
  await controller.resume({
    params: { id: 'CF-USER-B' },
    firebaseUser: { uid: 'user-b' },
    body: { workId: 'work-user-b' },
  }, userBResponse);

  const crossUserResponse = makeResponse();
  await controller.resume({
    params: { id: 'CF-USER-A' },
    firebaseUser: { uid: 'user-a' },
    body: { workId: 'work-user-b' },
  }, crossUserResponse);

  assert.equal(userAResponse.statusCode, 200);
  assert.equal(userBResponse.statusCode, 200);
  assert.equal(rooms.get('CF-USER-A').files[0].code, '<main>saved A only</main>');
  assert.equal(rooms.get('CF-USER-B').files[0].code, '<main>saved B only</main>');
  assert.equal(rooms.get('CF-USER-A').notes.text, 'notes A');
  assert.equal(rooms.get('CF-USER-B').notes.text, 'notes B');
  assert.equal(crossUserResponse.statusCode, 404);
  assert.deepEqual(savedRoomIds, ['CF-USER-A', 'CF-USER-B']);
});

test('resuming a room project requires a saved work owned by the room owner', async () => {
  const room = makeRoom();
  room.project = { id: 'project-CF-PROJ', ownerId: 'host-1', status: 'active', title: 'Portfolio editor' };
  const controller = createRoomProjectController({
    roomRepository: {
      fetchById: async () => room,
      save: async () => {
        throw new Error('save should not be called');
      },
    },
    profileController: {
      getSavedWorkForUser: async () => null,
      saveWorkForUser: async (_userId, work) => ({ ...work, id: 'work-room-project' }),
    },
  });
  const response = makeResponse();

  await controller.resume({
    params: { id: room.id },
    firebaseUser: { uid: 'host-1' },
    body: { workId: 'someone-elses-work' },
  }, response);

  assert.equal(response.statusCode, 404);
  assert.equal(room.files[0].code, '<main>Ready</main>');
});

test('resuming a room project rejects completed saved work', async () => {
  const room = makeRoom();
  room.project = { id: 'project-CF-PROJ', ownerId: 'host-1', status: 'active', title: 'Portfolio editor' };
  const savedWork = {
    id: 'work-ended-project',
    ownerId: 'host-1',
    type: 'room-project',
    originRoomId: room.id,
    name: 'Portfolio editor',
    projectStatus: 'completed',
    readOnly: true,
    activeFile: 'index.html',
    files: [{ name: 'index.html', language: 'html', code: '<main>Final</main>' }],
    notes: { text: 'Final notes', draws: [] },
  };
  const controller = createRoomProjectController({
    roomRepository: {
      fetchById: async () => room,
      save: async () => {
        throw new Error('save should not be called');
      },
    },
    profileController: {
      getSavedWorkForUser: async () => savedWork,
      saveWorkForUser: async (_userId, work) => ({ ...work, id: 'work-room-project' }),
    },
  });
  const response = makeResponse();

  await controller.resume({
    params: { id: room.id },
    firebaseUser: { uid: 'host-1' },
    body: { workId: savedWork.id },
  }, response);

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error, 'This project has ended and cannot be resumed or edited.');
  assert.equal(room.files[0].code, '<main>Ready</main>');
});

test('reopening saved work creates a room from the database snapshot', async () => {
  const savedRooms = [];
  const savedWork = {
    id: 'work-db-snapshot',
    ownerId: 'user-a',
    type: 'room-project',
    originRoomId: 'CF-OLD',
    name: 'Saved database project',
    roomName: 'Original Room Name',
    activeFile: 'styles.css',
    files: [
      { name: 'index.html', language: 'html', code: '<main>User A saved HTML</main>' },
      { name: 'styles.css', language: 'css', code: '.hero { color: tomato; }' },
    ],
    notes: { text: 'Saved from profile', draws: [] },
  };
  const controller = createRoomProjectController({
    roomRepository: {
      save: async (room) => savedRooms.push(structuredClone(room)),
    },
    roomService: {
      createRoom: (payload) => ({
        id: 'CF-NEW',
        hostToken: 'host-token',
        inviteCode: 'INVITE123',
        users: [],
        messages: [],
        timer: {},
        history: [],
        ...payload,
      }),
      snapshot: (room) => ({
        id: room.id,
        name: room.name,
        files: room.files,
        notes: room.notes,
        activeFile: room.activeFile,
        readOnly: room.readOnly,
        project: room.project,
      }),
    },
    profileController: {
      getSavedWorkForUser: async (userId, workId) => userId === 'user-a' && workId === savedWork.id ? savedWork : null,
    },
  });

  const response = makeResponse();
  await controller.reopenSavedWork({
    params: { userId: 'user-a', workId: savedWork.id },
    firebaseUser: { uid: 'user-a', name: 'User A' },
  }, response);

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.room.id, 'CF-NEW');
  assert.equal(response.body.room.name, 'Original Room Name');
  assert.equal(response.body.room.files.length, 2);
  assert.equal(response.body.room.files[0].code, '<main>User A saved HTML</main>');
  assert.equal(response.body.room.files[1].code, '.hero { color: tomato; }');
  assert.equal(response.body.room.activeFile, 'styles.css');
  assert.equal(response.body.room.project.workId, savedWork.id);
  assert.equal(savedRooms.length, 1);

  const denied = makeResponse();
  await controller.reopenSavedWork({
    params: { userId: 'user-b', workId: savedWork.id },
    firebaseUser: { uid: 'user-b', name: 'User B' },
  }, denied);

  assert.equal(denied.statusCode, 404);
});

test('reopening saved work restores the original active room when available', async () => {
  const originalRoom = {
    ...makeRoom(),
    id: 'CF-ORIG',
    ownerUserId: 'user-a',
    hostToken: 'original-host-token',
    inviteCode: 'ORIGIN12',
    files: [{ name: 'index.html', language: 'html', code: '<main>old room</main>' }],
    project: { id: 'project-CF-ORIG', ownerId: 'user-a', status: 'active', title: 'Original room' },
  };
  const savedWork = {
    id: 'work-original-room',
    ownerId: 'user-a',
    type: 'room-project',
    originRoomId: originalRoom.id,
    name: 'Original room',
    roomName: 'Original room',
    activeFile: 'index.html',
    files: [{ name: 'index.html', language: 'html', code: '<main>saved original room</main>' }],
    notes: { text: 'restore me', draws: [] },
  };
  let createRoomCalled = false;
  const savedRooms = [];
  const controller = createRoomProjectController({
    roomRepository: {
      fetchById: async (roomId) => roomId === originalRoom.id ? originalRoom : null,
      save: async (room) => savedRooms.push(structuredClone(room)),
    },
    roomService: {
      createRoom: () => {
        createRoomCalled = true;
        return {};
      },
      snapshot: (room) => ({
        id: room.id,
        files: room.files,
        notes: room.notes,
        activeFile: room.activeFile,
        project: room.project,
      }),
    },
    profileController: {
      getSavedWorkForUser: async (userId, workId) => userId === 'user-a' && workId === savedWork.id ? savedWork : null,
    },
  });
  const response = makeResponse();

  await controller.reopenSavedWork({
    params: { userId: 'user-a', workId: savedWork.id },
    firebaseUser: { uid: 'user-a', name: 'User A' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.room.id, originalRoom.id);
  assert.equal(savedRooms[0].name, 'Original room');
  assert.equal(savedRooms[0].project.title, 'Original room');
  assert.equal(response.body.restoredExistingRoom, true);
  assert.equal(response.body.room.files[0].code, '<main>saved original room</main>');
  assert.equal(response.body.room.notes.text, 'restore me');
  assert.equal(response.body.room.hostToken, 'original-host-token');
  assert.equal(createRoomCalled, false);
  assert.equal(savedRooms.length, 1);
});
