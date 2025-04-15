const { compareTextWithHash } = require("../helpers/md5");
const { signToken } = require("../helpers/jwt");
const poolNisa = require('../config/configNisa');

class LoginController {
  static async login(req, res, next) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const result = await poolNisa.query('SELECT * FROM mst_user WHERE muse_code = $1', [username]);
      const user = result.rows[0];

      if (!user || !compareTextWithHash(password, user.muse_password)) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const payload = { email: user.muse_email, name: user.muse_name, username: user.muse_code };
      const accessToken = signToken(payload);

      res.json({ access_token: accessToken });
    } catch (error) {
      next(error);
    }
  }

  static async autoLogin(req, res, next) {
    try {
      const { username, password } = req.query;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const result = await poolNisa.query('SELECT * FROM mst_user WHERE muse_code = $1', [username]);
      const user = result.rows[0];

      if (!user || password !== user.muse_password) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const payload = { email: user.muse_email};
      const accessToken = signToken(payload);

      res.json({ access_token: accessToken });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = LoginController;
