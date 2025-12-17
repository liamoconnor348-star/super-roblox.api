require("dotenv").config();

const express = require("express");
const noblox = require("noblox.js");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// =====================
// CONFIG
// =====================
const GROUP_ID = 16419863; // PUT YOUR GROUP ID HERE

// =====================
// LOGIN
// =====================
async function login() {
  if (!process.env.COOKIE) {
    console.error("COOKIE missing (add it in Replit Secrets)");
    return;
  }

  try {
    const user = await noblox.setCookie(process.env.COOKIE);
    console.log(`Logged in as ${user.UserName}`);
  } catch (err) {
    console.error("Cookie login failed:", err.message);
  }
}
login();

// =====================
// ROLE ORDER (DUPLICATE SAFE)
// =====================
async function getOrderedRoles() {
  const roles = await noblox.getRoles(GROUP_ID);
  return roles.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
}

async function changeRank(userId, direction) {
  const roles = await getOrderedRoles();
  const currentRoleName = await noblox.getRankNameInGroup(GROUP_ID, userId);
  const index = roles.findIndex(r => r.name === currentRoleName);
  if (index === -1) throw new Error("User not in group");

  let target = index;
  if (direction === "promote") target = Math.min(index + 1, roles.length - 1);
  if (direction === "demote") target = Math.max(index - 1, 0);

  await noblox.setRank(GROUP_ID, userId, roles[target].name);
  return roles[target].name;
}

// =====================
// COMMAND ROUTE
// =====================
app.post("/command", async (req, res) => {
  try {
    const input = req.body.command;
    const args = input.split(" ");
    const cmd = args[0].toLowerCase();

    if (cmd === "!promote") {
      const id = await noblox.getIdFromUsername(args[1]);
      const role = await changeRank(id, "promote");
      return res.send(`Promoted to ${role}`);
    }

    if (cmd === "!demote") {
      const id = await noblox.getIdFromUsername(args[1]);
      const role = await changeRank(id, "demote");
      return res.send(`Demoted to ${role}`);
    }

    if (cmd === "!setrank") {
      const id = await noblox.getIdFromUsername(args[1]);
      const roleName = args.slice(2).join(" ");
      const roles = await noblox.getRoles(GROUP_ID);
      const role = roles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
      if (!role) return res.send("Role not found");
      await noblox.setRank(GROUP_ID, id, role.name);
      return res.send(`Set rank to ${role.name}`);
    }

    res.send("Unknown command");
  } catch (e) {
    res.send("Error: " + e.message);
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
