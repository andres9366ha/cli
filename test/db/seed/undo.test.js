  'use strict';

var expect  = require('expect.js');
var Support = require(__dirname + '/../../support');
var helpers = require(__dirname + '/../../support/helpers');
var gulp    = require('gulp');

([
  'db:seed:undo --seed seedPerson.js'
]).forEach(function (flag) {
  var prepare = function (callback, options) {
    var _flag = options.flag || flag;

    var pipeline = gulp
      .src(Support.resolveSupportPath('tmp'))
      .pipe(helpers.clearDirectory())
      .pipe(helpers.runCli('init'))
      .pipe(helpers.copyMigration('createPerson.js'));

    if ( options.copySeeds ) {
      pipeline.pipe(helpers.copySeeder('seedPerson.js'));
    }

    pipeline.pipe(helpers.overwriteFile(JSON.stringify(helpers.getTestConfig()),
      'config/config.json'))
      .pipe(helpers.runCli('db:migrate'))
      .pipe(helpers.runCli(_flag, { pipeStderr: true }))
      .pipe(helpers.teardown(callback));
  };

  describe(Support.getTestDialectTeaser(flag), function () {
    it('stops execution if no seeder file is found', function (done) {
      prepare(function (err, output) {
        expect(output).to.contain('Unable to find migration');
        done();
      }.bind(this), {copySeeds: false});
    });

    it('is correctly undoing a seeder if they have been done already', function (done) {
      var self = this;

      prepare(function () {
        helpers.readTables(self.sequelize, function (tables) {
          expect(tables).to.have.length(2);
          expect(tables[0]).to.equal('Person');

          gulp
            .src(Support.resolveSupportPath('tmp'))
            .pipe(helpers.runCli(flag, { pipeStdout: true }))
            .pipe(helpers.teardown(function () {
              helpers.countTable(self.sequelize, 'Person', function (res) {
                expect(res).to.have.length(1);
                expect(res[0].count).to.eql(0);
                done();
              });
            }));
        });
      }, {flag: 'db:seed:all', copySeeds: true});
    });
  });
});
