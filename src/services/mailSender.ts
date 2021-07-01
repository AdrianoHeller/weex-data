import sender from "../modules/mailer";
// import pug from "pug";
import { Response } from "express";
// pug.renderFile(`${__dirname}/templates/forgot_password.pug`, {
//     token: token,
//   })
const sendMail = async (
  email: string,
  token: string,
  res: Response
): Promise<any> => {
  try {
    sender.sendMail(
      {
        to: email,
        from: "noreply@weexpass.com",
        subject: "Recuperar senha weex",
        html: `<p>Seu token: ${token}<p>`,
      },
      (err) => {
        debugger;
        if (err)
          return res
            .status(400)
            .send({ error: "Cannot send forgot password email" });
        return res.status(200).send({});
      }
    );
  } catch (err) {
    throw new Error(err);
  }
};

export default sendMail;