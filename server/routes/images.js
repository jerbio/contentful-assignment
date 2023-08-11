const path = require('path');
var express = require('express');
const { status } = require('express/lib/response');
const sharp = require('sharp');
var router = express.Router();


/* route acts as the end user's end point for serving images in their original sizes.*/
router.get('/users/:id', function(req, res, next) {
  let filePaths = 
    {
      '2e4d5d8f-ac55-4415-92f7-b1e78b58e0d3':{
        path: 'assets/pictimely_design_a_photo_of_an_adult_engaging_in_self_care._Mak_dafdfb21-bec3-46c1-8b17-6b0db999f334.png',
        contentType: 'image/png'
      },
      '4fc9b45e-b92a-4fd7-8df0-958ebb72ce0f':{
        path: 'assets/pictimely_design_a_photo_of_someone_responding_to_emails_10cea66b-1fbc-46df-8e5c-3e368d87e3ee.png',
        contentType: 'image/png'
      }
    };

  
    if(!(req && req.params && req.params.id)){
      res.send('Invalid path', 400);  
    }

  if(!filePaths[req.params.id]) {
    res.send('Image not found', 404);
    return;
  }



  const filePathInfo = filePaths[req.params.id];

  let absolutePath = path.resolve(filePathInfo.path);
  res.sendFile(absolutePath);
});

///This route takes a parameter as a encodedUriComponent of base64 json string in the format
///{uri:'www.example.com/image.png', contentType:'image/png'}

router.get('/data/:request', function(req, res, next) {
  if(!(req && req.params && req.params.request)){
    res.send('Invalid path', 400);  
  }

  let request64 = decodeURIComponent(req.params.request);
  const decodedRequestStr = atob(request64);
  const jsonParams = JSON.parse(decodedRequestStr);
  const {uri, contentType} = jsonParams;


  fetch(uri).then((data) => {
    if(!data.ok) {
      res(data.statusText, data.status)
    }

    data.arrayBuffer().then((imgBuffer) => {
      let height = -1;
      let width = -1;
      let ratio = 0;
      const presets = {
        'hd': {
          height: 720,
          width: 1280
        },
        'fhd': {
          height: 1080,
          width: 1920
        },
        'uhd': {
          height: 2160,
          width: 3840
        }
      };
      

      let fileBuffer = new Buffer.alloc(imgBuffer.byteLength);
      fileBuffer = Buffer.from(imgBuffer);
      const responseContentType = data.headers.get("Content-Type") || contentType;

      
      sharp(fileBuffer).toBuffer().then((buffer) => {
        function bufferToExtension(buffer) {
          if(query) {
            if(query.extension) {
              const extension = query.extension.toLowerCase();
              switch(extension) {
                case 'png':
                  sharp(buffer).png()
                  .toBuffer().then((buffer) => {
                    res.set('Content-Type', 'image/png');
                    res.send(buffer);
                  });
                  return;
                case 'jpg':
                case 'jpeg':
                  sharp(buffer).jpeg().toBuffer().then((buffer) => {
                    res.set('Content-Type', 'image/jpeg');
                    res.send(buffer);
                  });
                  return;
                case 'gif':
                  sharp(buffer).gif().toBuffer().then((buffer) => {
                    res.set('Content-Type', 'image/gif');
                    res.send(buffer);
                  });
                  return;
                default:
                  res.send(buffer);
                  return;
              }
            }
            res.send(buffer);
          }
        }


        res.set('Content-Type', responseContentType);
        const {query} = req;
        if(query) {
          if(query.preset) {
            const preset = query.preset.toLowerCase();
            if(presets[preset]) {
              height = presets[preset].height;
              width = presets[preset].width;
            }
          }
      
          if(query.resHeight && query.resHeight) {
            let {resHeight, resWidth} = query;
            resHeight = Number(resHeight);
            resWidth = Number(resWidth);
            if((!(isNaN(resHeight) && isNaN(resWidth))) && (resHeight>0 && resWidth > 0)) {
              height = resHeight;
              width = resWidth;
            }
          }
          if(query.ratio) {
            if(!isNaN(Number(query.ratio))) {
              ratio = Number(query.ratio);
            }
          }
        }
      
        function getNormalSize({ width, height, orientation }) {
          return (orientation || 0) >= 5
            ? { width: height, height: width }
            : { width, height };
        }
      
        if(height && width && height <= 0 && width <= 0 && (!ratio)) {
          bufferToExtension(buffer);
          return;
        }
      
      
        let sizeUpdate = null;
        const fitType = 'fill';
        sharp(buffer).metadata().then((sizeInfo) => {
          if((height||width) && (height != -1 || width != -1)) {
            sharp(buffer)
            .resize(width, height, {fit: fitType})
            .toBuffer().then(bufferToExtension);
            return;
          }

          if(ratio) {
            sizeUpdate = getNormalSize(sizeInfo);
            height = sizeUpdate.height;
            width = sizeUpdate.width;
            sharp(buffer)
            .resize(Math.round(width * ratio), Math.round(height * ratio), {fit: fitType})
            .toBuffer()
            .then(bufferToExtension);
            return;
          }
        });
      });
    });
  });;
});

module.exports = router;
