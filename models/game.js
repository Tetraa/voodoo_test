
module.exports = (sequelize, DataTypes) => {
  const Game = sequelize.define('Game', {
    publisherId: DataTypes.STRING,
    name: DataTypes.STRING,
    platform: DataTypes.STRING,
    storeId: {
      type: DataTypes.STRING,
      unique: true
    },
    bundleId: DataTypes.STRING,
    appVersion: DataTypes.STRING,
    isPublished: DataTypes.BOOLEAN,
  }, {});
  return Game;
};
