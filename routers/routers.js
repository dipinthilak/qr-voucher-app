const express = require("express");
const routers = express();
const crypto = require("crypto");
const session = require("express-session");
const QRCode = require('qrcode');
const PDFDocument = require("pdfkit");
const { executeQuery } = require("../db/dbConnection");

const { isLogin, isLogout } = require("../authentication/auth");

routers.use(
  session({
    secret: "firstprkey",
    resave: false,
    saveUninitialized: false,
  })
);

routers.set("view engine", "ejs");
routers.set("views", "./views");

routers.get("/", isLogout, (req, res) => {
  res.render("index");
});

routers.get("/home", isLogin, async (req, res) => {
  const query = `SELECT * FROM voucher_data ORDER BY createdDate DESC`;

  try {
    const result = await executeQuery(
      query,
      (values = []),
      (paramNames = []),
      (isStoredProcedure = false)
    );
    res.render("home", { voucher: result?.recordset });
  } catch (error) {
    console.error(error);
  }
});

routers.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (username === "user" && password === "password") {
    req.session.user = username;
    const query = `SELECT duration FROM voucher_settings`;

    try {
      const result = await executeQuery(
        query,
        (values = []),
        (paramNames = []),
        (isStoredProcedure = false)
      );
      req.session.duration=result.recordset[0].duration;
    } catch (er) {
      console.error(er);
    }

    res.redirect("/home");
  } else {
    res.redirect("/");
  }
});

routers.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

routers.get("/settings", isLogin, async (req, res) => {
  const query = `SELECT * FROM voucher_settings`;

  try {
    const result = await executeQuery(
      query,
      (values = []),
      (paramNames = []),
      (isStoredProcedure = false)
    );
    console.log("settings details", result.recordset);
    res.render("settings", { settings: result?.recordset });
  } catch (error) {
    console.error(error);
  }
});

routers.post("/save-settings", async (req, res) => {
  const query = `UPDATE voucher_settings 
  SET 
    duration = @duration, 
    width = @width, 
    height = @height, 
    title = @title, 
    normal = @normal
  WHERE id = @id`;
  let duration = Number(req.body.duration);
  let width = Number(req.body.width);
  let height = Number(req.body.height);
  let title = Number(req.body.titleSize);
  let normal = Number(req.body.normalSize);

  if (
    isNaN(duration) ||
    isNaN(width) ||
    isNaN(height) ||
    isNaN(title) ||
    isNaN(normal)
  ) {
    return res.status(400).send("Invalid input values.");
  }
  const data = [
    { name: "duration", value: duration },
    { name: "width", value: width },
    { name: "height", value: height },
    { name: "title", value: title },
    { name: "normal", value: normal },
    { name: "id", value: 1 },
  ];

  const paramNames = data.map((param) => param.name);
  const values = data.map((param) => param.value);
  const isStoredProcedure = false;

  try {
    const result = await executeQuery(
      query,
      values,
      paramNames,
      isStoredProcedure
    );
    req,session.duration=duration;

    res.send({ message: "Settings updated successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating settings");
  }
});

routers.post("/generate-qr", async (req, res) => {
  const code = crypto.randomInt(0, 10 ** 10);
  const createdDate = new Date();
  const expiryDate = new Date();
  const intervalDays = req.session?.duration || 10;
  expiryDate.setDate(createdDate.getDate() + intervalDays);

  const query = `INSERT INTO voucher_data (code, createdDate, expiryDate)
  VALUES (@code, @createdDate, @expiryDate)`;

  const data = [
    { name: "code", value: code },
    { name: "createdDate", value: createdDate },
    { name: "expiryDate", value: expiryDate },
  ];
  const paramNames = data.map((param) => param.name);
  const values = data.map((param) => param.value);
  const isStoredProcedure = false;
  try {
    const result = await executeQuery(
      query,
      values,
      paramNames,
      isStoredProcedure
    );
    console.log("qr--------data",result);

    QRCode.toDataURL("i am dipin", (err, src) => {
      if (err) {
        console.error('Error generating QR code:', err);
        return res.status(500).send('Error generating QR code');
      }
      res.send({ message: "Voucher created successfully!" ,data:{qrCodeSrc: src,code:code,createdDate:createdDate,expiryDate:expiryDate}});
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating voucher");
  }
});




routers.get("/printPdf", async (req, res) => {
  const { code, createdDate, expiryDate } = req.query;

  if (!code || !createdDate || !expiryDate) {
    return res.status(400).send("Missing required voucher details.");
  }

  try {
    if (typeof code !== "string" || !code.trim()) {
      throw new Error("Invalid code provided for QR generation.");
    }

    const qrCodeDataUri = await QRCode.toDataURL(code, {
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Voucher_${code}.pdf`);

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(18).text("Voucher Details", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Created Date: ${createdDate}`);
    doc.text(`Expiry Date: ${expiryDate}`);
    doc.moveDown();
    const qrCodeImageBuffer = Buffer.from(qrCodeDataUri.split(",")[1], "base64");
    doc.image(qrCodeImageBuffer, {
      fit: [150, 150],
      align: "center",
      valign: "center",
    });

    doc.end();

    console.log("PDF with QR code generated successfully.");
  } catch (error) {
    console.error("Error generating QR code or PDF:", error);
    res.status(500).send("Internal server error");
  }
});


module.exports = { routers };
  