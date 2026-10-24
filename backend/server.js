require('dotenv').config();
const express = require('express');
const cors = require('cors');
const profilesRouter = require('./routes/profiles');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Community Directory API is running ✅'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/profiles', profilesRouter);
app.use('/api/smart-search', require('./routes/smart'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
