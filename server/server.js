const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
const PDFDocument = require("pdfkit");
require("dotenv").config();
const db = require("./db");
const requireAuth = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 4 }
}));
app.use(express.static(path.join(__dirname, "..", "public")));

function cleanUser(row) {
  return { id: row.id, full_name: row.full_name, email: row.email, username: row.username };
}

app.post("/api/auth/register", async (req,res) => {
  try {
    const {full_name,email,username,password,confirm_password} = req.body;
    if (!full_name || !email || !username || !password) return res.status(400).json({error:"All fields are required."});
    if (password !== confirm_password) return res.status(400).json({error:"Passwords do not match."});
    if (password.length < 6) return res.status(400).json({error:"Password must be at least 6 characters."});
    const [existing] = await db.query("SELECT id FROM users WHERE email=? OR username=?", [email,username]);
    if (existing.length) return res.status(409).json({error:"Email or username already exists."});
    const hash = await bcrypt.hash(password, 12);
    const [r] = await db.query("INSERT INTO users(full_name,email,username,password) VALUES(?,?,?,?)",[full_name,email,username,hash]);
    await db.query("INSERT INTO profiles(user_id) VALUES(?)",[r.insertId]);
    res.json({message:"Registration successful."});
  } catch(e){ console.error(e); res.status(500).json({error:"Server/database error."}); }
});

app.post("/api/auth/login", async (req,res) => {
  try {
    const {identifier,password} = req.body;
    const [rows] = await db.query("SELECT * FROM users WHERE email=? OR username=? LIMIT 1",[identifier,identifier]);
    if (!rows.length || !(await bcrypt.compare(password || "", rows[0].password))) return res.status(401).json({error:"Invalid username/email or password."});
    req.session.userId = rows[0].id;
    res.json({user: cleanUser(rows[0])});
  } catch(e){ console.error(e); res.status(500).json({error:"Server/database error."}); }
});

app.post("/api/auth/logout",(req,res)=>req.session.destroy(()=>res.json({message:"Logged out."})));

app.get("/api/auth/me", async (req,res)=>{
  if(!req.session.userId) return res.status(401).json({error:"Not logged in."});
  const [rows]=await db.query("SELECT * FROM users WHERE id=?",[req.session.userId]);
  if(!rows.length) return res.status(401).json({error:"Session user not found."});
  res.json({user:cleanUser(rows[0])});
});

const tableMap = {
  education: ["institution","degree","field_of_study","start_date","end_date","grade","description"],
  skills: ["skill_name","skill_level"],
  projects: ["project_name","description","technologies","project_link","start_date","end_date"],
  experience: ["company","job_title","start_date","end_date","description"]
};

for (const [table, fields] of Object.entries(tableMap)) {
  app.get(`/api/${table}`, requireAuth, async (req,res)=>{
    const [rows]=await db.query(`SELECT * FROM ${table} WHERE user_id=? ORDER BY id DESC`,[req.session.userId]);
    res.json(rows);
  });
  app.post(`/api/${table}`, requireAuth, async (req,res)=>{
    try {
      const vals=fields.map(f=>req.body[f] ?? null);
      if(!vals[0]) return res.status(400).json({error:"Required field is missing."});
      const placeholders=fields.map(()=>"?").join(",");
      const [r]=await db.query(`INSERT INTO ${table} (${fields.join(",")},user_id) VALUES (${placeholders},?)`,[...vals,req.session.userId]);
      const [rows]=await db.query(`SELECT * FROM ${table} WHERE id=?`,[r.insertId]);
      res.json(rows[0]);
    } catch(e){console.error(e);res.status(500).json({error:"Could not save record."});}
  });
  app.put(`/api/${table}/:id`, requireAuth, async (req,res)=>{
    try {
      const sets=fields.map(f=>`${f}=?`).join(",");
      const vals=fields.map(f=>req.body[f] ?? null);
      const [r]=await db.query(`UPDATE ${table} SET ${sets} WHERE id=? AND user_id=?`,[...vals,req.params.id,req.session.userId]);
      if(!r.affectedRows) return res.status(404).json({error:"Record not found."});
      res.json({message:"Updated."});
    } catch(e){console.error(e);res.status(500).json({error:"Could not update record."});}
  });
  app.delete(`/api/${table}/:id`, requireAuth, async (req,res)=>{
    const [r]=await db.query(`DELETE FROM ${table} WHERE id=? AND user_id=?`,[req.params.id,req.session.userId]);
    if(!r.affectedRows) return res.status(404).json({error:"Record not found."});
    res.json({message:"Deleted."});
  });
}

app.get("/api/profile", requireAuth, async (req,res)=>{
  const [rows]=await db.query("SELECT * FROM profiles WHERE user_id=?",[req.session.userId]);
  res.json(rows[0] || {user_id:req.session.userId});
});
app.put("/api/profile", requireAuth, async (req,res)=>{
  const {phone,location,linkedin,github,professional_summary}=req.body;
  await db.query(`INSERT INTO profiles(user_id,phone,location,linkedin,github,professional_summary)
    VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE phone=VALUES(phone),location=VALUES(location),linkedin=VALUES(linkedin),github=VALUES(github),professional_summary=VALUES(professional_summary)`,
    [req.session.userId,phone||null,location||null,linkedin||null,github||null,professional_summary||null]);
  res.json({message:"Profile saved."});
});

app.get("/api/templates", async (req,res)=>{
  const [rows]=await db.query("SELECT * FROM resume_templates ORDER BY id");
  res.json(rows);
});
app.get("/api/resume", requireAuth, async (req,res)=>{
  const uid=req.session.userId;
  const [[user]]=await db.query("SELECT id,full_name,email,username FROM users WHERE id=?",[uid]);
  const [[profile]]=await db.query("SELECT * FROM profiles WHERE user_id=?",[uid]);
  const [education]=await db.query("SELECT * FROM education WHERE user_id=? ORDER BY end_date DESC,id DESC",[uid]);
  const [skills]=await db.query("SELECT * FROM skills WHERE user_id=? ORDER BY id DESC",[uid]);
  const [projects]=await db.query("SELECT * FROM projects WHERE user_id=? ORDER BY end_date DESC,id DESC",[uid]);
  const [experience]=await db.query("SELECT * FROM experience WHERE user_id=? ORDER BY end_date DESC,id DESC",[uid]);
  res.json({user,profile,education,skills,projects,experience});
});

app.get("/api/resume/pdf", requireAuth, async (req,res)=>{
  try {
    const uid=req.session.userId;
    const [[u]]=await db.query("SELECT * FROM users WHERE id=?",[uid]);
    const [[p]]=await db.query("SELECT * FROM profiles WHERE user_id=?",[uid]);
    const [edu]=await db.query("SELECT * FROM education WHERE user_id=? ORDER BY end_date DESC,id DESC",[uid]);
    const [skills]=await db.query("SELECT * FROM skills WHERE user_id=? ORDER BY id DESC",[uid]);
    const [projects]=await db.query("SELECT * FROM projects WHERE user_id=? ORDER BY end_date DESC,id DESC",[uid]);
    const [exp]=await db.query("SELECT * FROM experience WHERE user_id=? ORDER BY end_date DESC,id DESC",[uid]);
    res.setHeader("Content-Type","application/pdf");
    res.setHeader("Content-Disposition",'attachment; filename="resume.pdf"');
    const doc=new PDFDocument({margin:50});
    doc.pipe(res);
    doc.fontSize(24).font("Helvetica-Bold").text(u.full_name || "Your Name");
    doc.fontSize(10).font("Helvetica").text([u.email,p?.phone,p?.location,p?.linkedin,p?.github].filter(Boolean).join("  |  "));
    const section=(title)=>{doc.moveDown(1);doc.fontSize(13).font("Helvetica-Bold").text(title);doc.moveTo(50,doc.y).lineTo(545,doc.y).stroke();doc.moveDown(.35);};
    if(p?.professional_summary){section("PROFESSIONAL SUMMARY");doc.fontSize(10).font("Helvetica").text(p.professional_summary);}
    if(exp.length){section("EXPERIENCE");exp.forEach(x=>{doc.fontSize(11).font("Helvetica-Bold").text(`${x.job_title} — ${x.company}`);doc.fontSize(9).font("Helvetica").text(`${x.start_date||""} to ${x.end_date||"Present"}`);doc.fontSize(10).text(x.description||"");doc.moveDown(.5);});}
    if(projects.length){section("PROJECTS");projects.forEach(x=>{doc.fontSize(11).font("Helvetica-Bold").text(x.project_name);doc.fontSize(9).font("Helvetica").text(x.technologies||"");doc.fontSize(10).text(x.description||"");if(x.project_link)doc.fontSize(9).text(x.project_link);doc.moveDown(.5);});}
    if(edu.length){section("EDUCATION");edu.forEach(x=>{doc.fontSize(11).font("Helvetica-Bold").text(`${x.degree}${x.field_of_study?" — "+x.field_of_study:""}`);doc.fontSize(10).font("Helvetica").text(`${x.institution}${x.grade?" | "+x.grade:""}`);doc.fontSize(9).text(`${x.start_date||""} to ${x.end_date||""}`);doc.moveDown(.4);});}
    if(skills.length){section("SKILLS");doc.fontSize(10).font("Helvetica").text(skills.map(s=>`${s.skill_name} (${s.skill_level})`).join("  •  "));}
    doc.end();
  } catch(e){console.error(e); if(!res.headersSent)res.status(500).json({error:"PDF generation failed."});}
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"..","public","index.html")));
app.listen(PORT,()=>console.log(`Resume Builder running at http://localhost:${PORT}`));
