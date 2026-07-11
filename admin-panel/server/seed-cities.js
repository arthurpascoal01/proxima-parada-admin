require('dotenv').config();
const { connectDB } = require('./config/db');
const City = require('./models/City');

const cities = [
  { name:'São Paulo', slug:'sao-paulo', state:'SP', lat:-23.5505, lon:-46.6333 },
  { name:'Rio de Janeiro', slug:'rio-de-janeiro', state:'RJ', lat:-22.9068, lon:-43.1729 },
  { name:'Florianópolis', slug:'florianopolis', state:'SC', lat:-27.5954, lon:-48.5480 },
  { name:'Gramado', slug:'gramado', state:'RS', lat:-29.3747, lon:-50.8763 },
  { name:'Barueri', slug:'barueri', state:'SP', lat:-23.4979328, lon:-46.874624 }
];

async function seed() {
  await connectDB();
  for (const city of cities) await City.updateOne({ slug: city.slug }, { $setOnInsert: city }, { upsert: true });
  console.log('Cidades iniciais cadastradas sem sobrescrever dados existentes.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
