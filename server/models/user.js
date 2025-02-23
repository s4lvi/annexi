// server/models/user.js
class User {
  constructor(username, password) {
    this.id = User.incrementId();
    this.username = username;
    this.password = password; // Reminder: hash passwords in production!
    this.createdAt = new Date();
  }

  static incrementId() {
    User.currentId = (User.currentId || 0) + 1;
    return User.currentId;
  }
}

module.exports = User;
