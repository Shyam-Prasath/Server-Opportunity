const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const Resume = require('./models/Resume');

const app = express();
app.use(express.json());

const resumeRoutes = require('./routes/resume');
app.use(resumeRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String
});

const User = mongoose.model('User', userSchema);

app.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await User.create({ email, password: hashed, role });
  res.json({ message: 'User registered successfully' });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ email: user.email, role: user.role }, 'secret123');
  res.json({ token, role: user.role });
});

const jobSchema = new mongoose.Schema({
  jobTitle: String,
  jobDescription: String,
  companyName: String,
  skillsRequired: String,
  marks10th: Number,
  marks12th: Number,
  collegeCgpa: Number,
  postedBy: String,
  postedAt: { type: Date, default: Date.now },
});

const Job = mongoose.model('Job', jobSchema);

app.post('/jobs', async (req, res) => {
  try {
    const {
      jobTitle, jobDescription, companyName,
      skillsRequired, marks10th, marks12th, collegeCgpa, postedBy,
    } = req.body;

    const job = new Job({
      jobTitle, jobDescription, companyName,
      skillsRequired, marks10th, marks12th, collegeCgpa, postedBy
    });

    await job.save();
    res.json({ message: 'Job posted successfully', job });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to post job' });
  }
});

app.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ postedAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET all resumes (for admin)
app.get('/resumes', async (req, res) => {
  try {
    const resumes = await Resume.find({}, { email: 1, name: 1, skills: 1, academic: 1, _id: 0 }); // project fields
    res.json(resumes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});


app.listen(5001, () => console.log('🚀 Server running on http://localhost:5001'));
