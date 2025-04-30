const httpntlm = require("httpntlm");
const env = require("../config/env");
const logger = require("../utils/logger");
const { encrypt } = require("../utils/crypto");

const login = async (req, res) => {
  const { username, password } = req.body;
  logger.info(`Request: POST /api/auth/login`);

  if (!username || !password) {
    return res.status(400).json({ error: "نام کاربری و رمز عبور الزامی است" });
  }

  try {
    const ntlmResponse = await new Promise((resolve, reject) => {
      httpntlm.get(
        {
          url: `${env.crmUrl}/systemusers?$select=systemuserid,fullname&$filter=domainname eq '${username}'`,
          username: username.split("\\")[1],
          password: password,
          domain: env.domain,
          workstation: "",
        },
        (err, response) => {
          if (err) return reject(err);
          resolve(response);
        }
      );
    });

    if (ntlmResponse.statusCode !== 200) {
      logger.error(`LDAP bind failed: ${ntlmResponse.statusCode}`);
      return res
        .status(401)
        .json({ error: "نام کاربری یا رمز عبور اشتباه است" });
    }

    const data = JSON.parse(ntlmResponse.body);
    const user = data.value && data.value.length > 0 ? data.value[0] : null;

    if (!user) {
      logger.error("User not found in CRM");
      return res.status(401).json({ error: "کاربر در سیستم یافت نشد" });
    }

    const encryptedPassword = encrypt(password);

    req.session.user = {
      username: username,
      id: user.systemuserid,
      fullname: user.fullname,
    };
    req.session.encryptedPassword = encryptedPassword;

    logger.info(`Login success for ${username}`);
    res.status(200).json({ message: "ورود با موفقیت انجام شد" });
  } catch (err) {
    throw err; // Let errorMiddleware handle it
  }
};

const logout = (req, res) => {
  logger.info(`Request: POST /api/auth/logout`);
  req.session.destroy((err) => {
    if (err) {
      logger.error(`Logout error: ${err.message}`);
      return res.status(500).json({ error: "خطا در خروج" });
    }
    res.status(200).json({ message: "خروج با موفقیت انجام شد" });
  });
};

module.exports = { login, logout };
