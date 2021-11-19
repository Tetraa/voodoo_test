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
  Promise.all([gplay.list({
    collection: gplay.collection.TOP_FREE_GAMES,
    num: 100
  }), store.list({
    collection: store.collection.TOP_FREE,
    category: store.category.GAMES,
    num: 100
  })]).then((values) => {
    if (values.length < 2) throw new Error('***Not abble to crawl the stores corectly');
    populateAfterProcess(values[0], values[1], res);
  }).catch((err) => {
    console.log('***There was an error creating the top 100 games of each store', err);
    return res.status(400).send(err);
  });
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

  db.Game.findAll()
    .then(gamesFound => {
    const gamesUpdate = [];
    for (const game in gameList) {
      for (const gameFound in gamesFound) {
        if (gamesFound[gameFound].name === gameList[game].name 
            && gamesFound[gameFound].platform === gameList[game].platform) {
              gamesUpdate.push({
                old: gamesFound[gameFound],
                new: gameList[game]
              });
              gameList.splice(game, 1)
            }
      }
    }
    populateDBWithTop100(gameList, gamesUpdate, res);
    updatedDBGames(gamesUpdate);
  })
}

function updatedDBGames(gamesUpdate) {
  for (const game in gamesUpdate) {
    gamesUpdate[game].old.update(gamesUpdate[game].new)
        .catch((err) => {
          console.log('***Error updating game', err);
    });
  }
}

function populateDBWithTop100(gameList, gamesUpdate,res) {

  return db.Game.bulkCreate(gameList, {
    fields: ['publisherId', 'name', 'platform', 'storeId', 'bundleId', 'isPublished']
  })
  .then(games => {
    return res.send({insert: games, tryToUpdate: gamesUpdate})
  })
  .catch((err) => {
    console.log('***There was an error creating the top 100 games of each store', err);
    return res.status(400).send(err);
  });
}


function findAll(res) {
  db.Game.findAll()
    .then(games => res.send(games))
    .catch((err) => {
      console.log('There was an error querying games', err);
      return res.send(err);
    });
}

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
