let fs = require('fs');

let srcTxt = fs.readFileSync('./data/continents.geojson');
let srcJson = JSON.parse(srcTxt);


// format json
// var jsTxt = JSON.stringify(srcJson, null , 4);
// fs.writeFileSync('./data/continents.geojson', jsTxt);





// test on one array
// console.log(srcJson);
// var oldArr = srcJson.features[0].geometry.coordinates[0];
// console.log(oldArr);


// let newArr = oldArr
//                   .map(a => {
//                         return a.map(b => {
//                           return [b[1], b[0]];
//                         })
//                       })

// console.log('---');
// console.log(newArr);

















let tgtJson = JSON.parse(srcTxt);
tgtJson.features = [];




for(let i=0; i<srcJson.features.length; i++) {
  let oldObj = srcJson.features[i];

  var oldArr = srcJson.features[i].geometry.coordinates[0];
  // console.log(oldArr);


  let newArr = oldArr
                    .map(a => {
                      return a.map(b => {
                        return [b[1], b[0]]
                      })
                    });

  // console.log('---');
  // console.log(newArr);

  let newObj = JSON.parse(JSON.stringify(srcJson.features[i]));
  newObj.geometry.coordinates = [newArr];
  tgtJson.features.push(newObj);
  // console.log('-------------');
  // console.log('-------------');
}


var jsTxt = JSON.stringify(tgtJson, null , 4);


fs.writeFileSync('./data/continents_2.geojson', jsTxt);

