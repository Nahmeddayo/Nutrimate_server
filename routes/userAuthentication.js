const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Users = require("../model/user");
const Otp = require("../model/otp");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const nodemailer = require("nodemailer");
const JWT_SECRET =
  "sfaosoowennsflaaoosdnqnwieieiwdnsnnsasdasdkasdkqwiebsicxzicbzibaibdd";

router.post("/registerUser", async (req, res) => {
  const {
    name,
    email,
    phoneNumber,
    password,
    code,
  } = req.body;

  if (!name || typeof name !== "string") {
    return res.json({
      status: "error",
      message: "Invalid Username",
    });
  }

  if (!password || typeof password !== "string") {
    return res.json({
      status: "error",
      message: "Invalid password",
    });
  }

  if (password.length < 5) {
    res.status(400).send({
      message: "Password should be greater than 5 character",
      status: "error",
    });
  }
  let pass = await bcrypt.hash(password, 10);
  console.log(email, code, "THIGNSS");
  let data = await Otp.find({ email, otp: code });
  console.log(data, "DDDDDDDDDDDDD");
  const response = {};
  if (data.length > 0) {
    let time = new Date().getTime();
    let diff = data[0].expiresIn - time;
    console.log(diff, "DIFFFF");
    if (diff < 0) {
      const result = await Otp.findByIdAndDelete({ _id: data[0]._id })
      res.status(400).send({
        message: "Code Expired",
        status: "error",
      });
    } else {
      try {
        const result = await Users.create({
          name,
          password:pass,
          phoneNumber,
          email: req.body.email,
        });
        res.status(200).send({
          message: "user created successfully",
          status: "ok",
          data: result,
        });
      } catch (error) {
        if (error.code == 11000) {
          return res.status(400).json({
            status: "error",
            message: "email or phone already in use",
          });
        }else{
        return res.status(400).json({
          status: "error",
          message: "something went wrong Salman",
        });
      }
    }
    }
  } else {
    res.status(400).send({
      message: "Invalid Code or email",
      status: "error",
    });
  }
});

router.post("/sendCode", async (req, res) => {
  const { email } = req.body;
  try {
    let otp = Math.floor(1000 + Math.random() * 9000);
    var mail = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "Jobia4801@gmail.com",
        pass: "grhtvruaqsucqcsz",
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    let mailOptions = {
      from: "noreply@jobia",
      to: email,
      subject: "User Verification",
      text: `Your Verification code is ${otp}`,
    };
    console.log(mailOptions, "mailOptions");

    let result = await Otp.create({
      email,
      otp,
      expiresIn: new Date().getTime() + 300 * 1000,
    });

    mail.sendMail(mailOptions, (err, result) => {
      if (err) {
        console.log(err, "errr");
        res.status(400).send({
          status: "error",
          message: "Something went Wrong",
        });
      } else {
        console.log("calledddd");
        res.send({
          status: "success",
          message: "Verification Code has been sent to your email",
        });
      }
    });
  } catch (error) {
    res.status(400).send({
      status: "error",
      message: "Something went wrong",
    });
    console.log(error, "ERRRR");
  }
});

router.post("/loginUser", async (req, res) => {
    console.log("called");
  const { email, password } = req.body;
  try {
    const user= await Users.findOne({ email })
      if (!user) {
        return res.status(400).send({
          status: "error",
          message: "email not found",
        });
      }
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign(
          {
            id: user._id,
            name: user.name,
          },
          JWT_SECRET
        );
        if (user) {
          user["password"] = null;
          const params = {
            token: token,
            userDetails: user,
          };
          return res.status(200).send({
            status: "ok",
            data: params,
            message: "User Logged In Successfully",
          });
        } else {
          return res.status(400).json({
            status: "error",
            message: "Your account is not approved",
          });
        }
      }
      res
        .status(400)
        .send({ status: "error", message: "Invalid email or password" });
  } catch (error) {
    console.log(error,"errorrrrrrrrrrr");
    res.status(400).send({
      status: "error",
      message: "Something went wrong",
    });
  }
});

router.post("/resetPasswordUser", async (req, res) => {
  const { email, otp, password } = req.body;
  try {
    let data = await Otp.find({ email, otp });
    console.log(data, "DDDDDDDDDDDDD");
    const response = {};
    if (data.length > 0) {
      let time = new Date().getTime();
      let diff = data[0].expiresIn - time;
      if (diff < 0) {
        const result = await Otp.findByIdAndDelete({ _id: data[0]._id }).exec(
          function (err, resuuuu) {
            if (err) {
              console.log(err, "ERRRRORRRR");
            } else {
              console.log(resuuuu, "RRRRRRRRRRRRRRRRRRR");
            }
          }
        );
        console.log(result, "RXXXXXXXXXXXXX");
        res.status(400).send({
          message: "Token Expired",
          status: "error",
        });
      } else {
        let user = await Users.findOne({ email });
        if (user) {
          const hashed = await bcrypt.hash(password, 10);
          const _id = user.id;
          await Users.updateOne(
            { _id },
            {
              $set: { password: hashed },
            }
          );
          const result = Otp.findByIdAndDelete({ _id: data[0]._id }).exec(
            function (err, resuuuu) {
              if (err) {
                // res.status(400).send({ error: "id not found" })
              } else {
                //     if (resuuuu) return res.send({ data: resuuuu, status: "ok" })
                //     else
                //         return res.send({ data: "not found" })
                // }
              }
            }
          );

          res.status(200).send({
            status: "ok",
            message: "Successfully Reset password",
          });
        } else {
          res.status(400).send({
            status: "error",
            message: "Email not found",
          });
        }
      }
    } else {
      res.status(400).send({
        message: "Invalid Otp",
        status: "error",
      });
    }
  } catch (error) {
    res.status(400).send({
      status: "error",
      message: "Something went wrong",
    });
  }
});

module.exports = router;