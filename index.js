const express = require('express');
const bodyParser = require('body-parser');
const db = require('./models');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const gplay = require('google-play-scraper');
const store = require('app-store-scraper');

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
  if (platform === 'ios' || platform === 'android') whereClose.platform = platform;
  return db.Game.findAll({
    where: whereClose
  })
    .then(game => res.send(game))
    .catch((err) => {
      console.log('***There was an error querying a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});


app.get('/api/games/populate', (req, res) => {
  requestAndroidTopGames(res, populateAfterProcess);
});

function populateAfterProcess(androidGames, iosGames, res) {
  const gameList = [];

  for (const game in androidGames) {
    const item = androidGames[game];
    gameList.push({ 
      publisherId: item.developerId, 
      name: item.title, 
      platform: 'android', 
      storeId: item.appId, 
      bundleId: item.appId, 
      isPublished: true 
    });
  }

  for (const game in iosGames) {
    const item = iosGames[game];
    gameList.push({ 
      publisherId: item.developerId.replace('?uo=2', ''),
      name: item.title, 
      platform: 'ios', 
      storeId: item.id,
      bundleId: item.appId, 
      isPublished: true 
    });
  }

  return populateDBWithTop100(gameList, res);
}

function populateDBWithTop100(gameList, res) {
  return db.Game.bulkCreate(gameList, {
    fields: ['publisherId', 'name', 'platform', 'storeId', 'bundleId', 'isPublished'],
    ignoreDuplicates: true
  })
  .then(games => res.send(games))
  .catch((err) => {
    console.log('***There was an error creating the top 1000 games of each store', JSON.stringify(err));
    return res.status(400).send(err);
  });
}

function requestAndroidTopGames(res, callback) {
  gplay.list({
    collection: gplay.collection.TOP_FREE,
    num: 100
  }).then(games => {
    requestIosTopGames(games, res, callback)
  }).catch((err) => {
    console.log('***There was an error querying top android games', JSON.stringify(err));
    return res.status(400).send(err);
  });
}

function requestIosTopGames(androidGames, res, callback) {
  store.list({
    collection: store.collection.TOP_FREE,
    num: 100
  })
    .then((iosGames) => {
      callback(androidGames, iosGames, res);
    })
    .catch((err) => {
      console.log('***There was an error querying top ios games', JSON.stringify(err));
      return res.status(400).send(err);
    });
}


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
