class AuthorizationController {
  static async updateAccess(req, res, next) {
    const name = req.userAccount.name;
    return res.status(200).json({ name: name });
  }
}

module.exports = AuthorizationController;
