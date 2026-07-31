import { admin } from "./backend/config/firebase.js";
console.log(typeof admin.auth);
if (typeof admin.auth === "function") {
    console.log(typeof admin.auth().getUser);
}
