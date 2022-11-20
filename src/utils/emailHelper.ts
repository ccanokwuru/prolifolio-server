import nodeMailer = require("nodemailer");
import { render } from "nunjucks";
import { join } from "path";
enum TEMPLATE {
  welcome = "welcome",
  otp = "otp",
  listing = "listing",
  password = "password-reset",
}

interface EmailI {
  template: TEMPLATE;
  to: string;
  data?: object;
  subject: string;
}

const send = async (data: EmailI) => {
  // const testAccount = await nodeMailer.createTestAccount();

  const transporter = nodeMailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp-relay.sendinblue.com",
    port: !Number.isNaN(Number(process.env.EMAIL_HOST))
      ? Number(process.env.EMAIL_HOST)
      : 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL ?? "cccanoks@gmail.com", // generated ethereal user
      pass: process.env.SMTP_PWD ?? "CH12G764hSDRvPkw", // generated ethereal password
    },
  });

  try {
    const renderTemplate = render(
      join(__dirname, `/email/${data.template}.njk`),
      {
        title: data.subject,
        data: data.data,
      }
    );
    const info = await transporter.sendMail({
      from: '"Prolifolio" <info@prolifolio.vercel.app>',
      to: data.to,
      subject: data.subject,
      html: renderTemplate,
    });

    return { info, message: "successful" };
  } catch (error) {
    console.error(error);
    return {
      message: "failed",
      // @ts-ignore
      error: error?.message,
    };
  }
};

export { send, TEMPLATE };
