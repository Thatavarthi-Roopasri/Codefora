import assert from "node:assert/strict";
import test from "node:test";
import { applyWorkDeletionToProfile, applyWorkSaveToProfile, assertWorkCanBeUpdated, assertWorkOwnership, collapseDuplicateWorks, getStableWorkId, getWorkMetrics } from "../controllers/profileController.js";

function makeWork(userId, files) {
  const input = {
    name: "Playground Project",
    type: "playground",
    files
  };
  const metrics = getWorkMetrics(input);
  return {
    ...input,
    ...metrics,
    id: getStableWorkId(userId, input),
    updatedAt: 1_700_000_000_000
  };
}

test("each signed-in user gets a separate stable work record", () => {
  const firstUserWork = makeWork("google-user-one", [{ code: "console.log('one');" }]);
  const secondUserWork = makeWork("google-user-two", [{ code: "console.log('two');" }]);

  assert.notEqual(firstUserWork.id, secondUserWork.id);

  const firstProfile = applyWorkSaveToProfile({}, firstUserWork);
  const secondProfile = applyWorkSaveToProfile({}, secondUserWork);

  assert.equal(firstProfile.stats.savedWorks, 1);
  assert.equal(secondProfile.stats.savedWorks, 1);
  assert.equal(firstProfile.activities[0].workId, firstUserWork.id);
  assert.equal(secondProfile.activities[0].workId, secondUserWork.id);
});

test("saving the same workspace updates its contribution without adding another work", () => {
  const initialWork = makeWork("google-user-one", [{ code: "const answer = 42;" }]);
  const initialProfile = applyWorkSaveToProfile({}, initialWork);
  const updatedWork = makeWork("google-user-one", [{ code: "const answer = 42;\n".repeat(180) }]);
  const updatedProfile = applyWorkSaveToProfile(initialProfile, updatedWork, initialWork);

  assert.equal(initialWork.id, updatedWork.id);
  assert.equal(updatedProfile.stats.savedWorks, 1);
  assert.equal(updatedProfile.stats.workContributions, updatedWork.contributionCount);
  assert.equal(updatedProfile.activities.filter((activity) => activity.workId === updatedWork.id).length, 1);
});

test("room backed work keeps the same id when only the display name changes", () => {
  const firstWorkId = getStableWorkId("google-user-one", {
    name: "Project in CF-ROOM",
    type: "room-project",
    originRoomId: "CF-ROOM"
  });
  const renamedWorkId = getStableWorkId("google-user-one", {
    name: "My Real Room Name",
    type: "room-project",
    originRoomId: "CF-ROOM"
  });

  assert.equal(firstWorkId, renamedWorkId);
});

test("saving from a reopened project can reuse the original saved work id", () => {
  const workId = getStableWorkId("google-user-one", {
    id: "work-461bb2d98ccee1e657aeb903",
    name: "new one",
    type: "room-project",
    originRoomId: "CF-NEW"
  });

  assert.equal(workId, "work-461bb2d98ccee1e657aeb903");
});

test("legacy reopened room projects with the same name collapse to the latest saved card", () => {
  const works = collapseDuplicateWorks([
    {
      id: "work-older",
      name: "new one",
      roomName: "new one",
      type: "room-project",
      originRoomId: "CF-OLD",
      updatedAt: 100
    },
    {
      id: "work-newer",
      name: "new one",
      roomName: "new one",
      type: "room-project",
      originRoomId: "CF-NEW",
      updatedAt: 200
    }
  ]);

  assert.equal(works.length, 1);
  assert.equal(works[0].id, "work-newer");
});

test("deleting saved work removes stale profile activity and recalculates saved work stats", () => {
  const remainingWork = {
    id: "work-remaining",
    name: "Remaining",
    type: "room-project",
    contributionCount: 3,
    updatedAt: 300
  };
  const profile = applyWorkDeletionToProfile(
    {
      stats: { savedWorks: 2, workContributions: 5, problemsSolved: 7 },
      activities: [
        { type: "work_save", workId: "work-deleted", text: "Saved deleted" },
        { type: "work_end", workId: "work-deleted", text: "Ended deleted" },
        { type: "work_save", workId: "work-remaining", text: "Saved remaining" }
      ]
    },
    ["work-deleted"],
    [remainingWork]
  );

  assert.equal(profile.stats.savedWorks, 1);
  assert.equal(profile.stats.workContributions, 3);
  assert.equal(profile.stats.problemsSolved, 7);
  assert.equal(profile.stats.lastWorkSavedAt, 300);
  assert.deepEqual(profile.activities.map((activity) => activity.workId), ["work-remaining"]);
});

test("non room work still separates different project names", () => {
  const firstWorkId = getStableWorkId("google-user-one", {
    name: "First Playground",
    type: "playground"
  });
  const secondWorkId = getStableWorkId("google-user-one", {
    name: "Second Playground",
    type: "playground"
  });

  assert.notEqual(firstWorkId, secondWorkId);
});

test("a signed-in user cannot overwrite another user's saved work", () => {
  const firstUserWork = {
    ...makeWork("google-user-one", [{ code: "const privateWork = true;" }]),
    ownerId: "google-user-one"
  };

  assert.throws(
    () => assertWorkOwnership(firstUserWork, "google-user-two"),
    { message: "You cannot modify another user's saved work.", statusCode: 403 }
  );
});

test("an ended saved work cannot be updated again", () => {
  const completedWork = {
    ...makeWork("google-user-one", [{ code: "const archived = true;" }]),
    ownerId: "google-user-one",
    projectStatus: "completed",
    readOnly: true
  };

  assert.throws(
    () => assertWorkCanBeUpdated(completedWork),
    { message: "This project has ended and is read-only.", statusCode: 409 }
  );
});
