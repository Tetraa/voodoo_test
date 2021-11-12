const express = require('express');
const bodyParser = require('body-parser');
const db = require('./models');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

app.get('/api/games', (req, res) => findAll(res));

app.post('/api/games', (req, res) => {
  const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
  return db.Game.create({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
    .then(game => res.send(game))
    .catch((err) => {
      console.log('***There was an error creating a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});

app.delete('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then(game => game.destroy({ force: true }))
    .then(() => res.send({ id }))
    .catch((err) => {
      console.log('***Error deleting game', JSON.stringify(err));
      res.status(400).send(err);
    });
});

app.put('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => {
      const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
      return game.update({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
        .then(() => res.send(game))
        .catch((err) => {
          console.log('***Error updating game', JSON.stringify(err));
          res.status(400).send(err);
        });
    });
});



app.post('/api/games/search', (req, res) => {
  // eslint-disable-next-line radix
  const { name, platform } = req.body;
  if ((!platform && !name) || (platform === '' && name === '')) return findAll(res);

  const whereClose = {};
  if (name) {
    whereClose.name = { [Op.like]: `%${name}%` };
  }
  if(platform === 'ios' || platform === 'android') whereClose.platform = platform;
  return db.Game.findAll({
    where: whereClose
  })
    .then(game => res.send(game))
    .catch((err) => {
      console.log('***There was an error querying a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});


function findAll(res) {
  db.Game.findAll()
    .then(games => res.send(games))
    .catch((err) => {
      console.log('There was an error querying games', JSON.stringify(err));
      return res.send(err);
    });
}

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
