var express = require('express');
var router = express.Router();
var cons = require('../constants.js');

router.route('/')
    .get(function(req, res) {
         
         //{'objectId':req.session.objectId}
         
         //console.log("select_app: req.headers['objectId'] ")
         //console.log("select_app: req.session.objectId ")

//         req.headers['objectId'] = req.session.objectId
//
//         res.send(JSON.stringify(req, null, 4));

         //Parse.Cloud.run('app', {adminId:"s6vPS3V3JP"}).then(function(results) {
                                                             
                                                            
        Parse.Cloud.run('app', {adminId:req.session.objectId}).then(function(results) {

                                         
                //req.param = {objectId:req.session.objectId}
                res.render('select_app', {
                    title: 'Select App',
                    results: results,
                    devNameBold:cons.DEVELOPER_NAME_BOLD,
                    devNameThin:cons.DEVELOPER_NAME_THIN
                });
            });
    })
    .post(function(req, res) {
        if (!req.session.objectId) {
            res.redirect('login')
        } else {
            var app =JSON.parse(req.body.app)
            var json = {objectId:app.objectId,name:app.name,fakeData:app.fakeData,defaultType:app.defaultType,facebookPostPath:app.facebookPostPath,facebookAccessToken:app.facebookAccessToken}
            req.session.app = json
            res.redirect('admin')
        }
    });

module.exports = router;
