
            /*
            POSTMAN JSON ORNEGI (Veriler asagidaki gibi buraya post edilecek)
            {
                "token": "4444-4444-ffff-4444-222222222",
                "olusturan": "Mehmet TOKMAK",
                "mesaj": "Test",
                "kisiler": ["90","80","210"]
            }
            TUM DUYURULARI GORMEK ICIN: -> http://localhost:3000/tumduyurular
            OKUNMAMIS DUYURULARI GORMEK ICIN: -> http://localhost:3000/okunmamisduyurular
            OKUNMUS DUYURULARI GORMEK ICIN: -> http://localhost:3000/okunmusduyurular
            {
                "id": "80",
                "token": "5b479aa6-4c57-4eff-8a19-03896e8d29c0"
            }
            */



const fs = require("fs");

const cert = fs.readFileSync("../sslverisi/CER-CRT-Files/test_test_com.crt");
const ca = fs.readFileSync("../sslverisi/CER-CRT-Files/My_CA_Bundle.ca-bundle");
const key = fs.readFileSync("../sslverisi/ek/test.test.com.key");





var bodyParser = require('body-parser');
const express = require('express');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


const http = require('http');
const https = require('https');
const redirectHttps = require('redirect-https');
const MongoClient = require("mongodb").MongoClient;
const ip = require("ip");

var nodeJSBildirimToken = "5b479aa6-4c57-4eff-8a19-03896e8d29c0";

let redirectOptions = {port: 443}

let httpsOptions = {
	cert:cert,
	ca:ca,
	key:key
}

httpServer = http.createServer(redirectHttps(redirectOptions));
server = https.createServer(httpsOptions, app);

httpServer.listen(80, function(){
	console.log("HTTP 80 portu dinlemede");
});
server.listen(443, function(){
	console.log("HTTPS 443 portu dinlemede");
});




const io = require("socket.io").listen(server);




MongoClient.connect("mongodb://admin:test@localhost", {"useNewUrlParser": true}, function(err, mongoData){
    if (err) throw err;
    var vt = mongoData.db("bildirim");
    console.log("MongoDB baglantisi basarili");


    


        var herkes = {}
        var her_sckid = [];

        var benim_sckID = "";
        var benim_ID = "";



        function onlinegoster(){
            console.log("Online: "+io.engine.clientsCount);
        }


        io.on("connection", function(socket){
            benim_sckID = socket.id



            socket.emit("ilkbaglanti", herkes);

                console.log(herkes);

            socket.on("disconnect", function(){
                vt.collection("genel").updateOne({sckid: socket.id}, {$set: {online: "0"}});
                if (herkes[socket.id] && herkes[socket.id]["id"])
                {
                    io.emit("offline", {
                        "sckid": socket.id,
                        "id": herkes[socket.id]["id"]
                    });
                    her_sckid.splice(her_sckid.indexOf(socket.id), 1);
                }


                delete herkes[socket.id];
                console.log(benim_ID+" "+socket.id+" cikis yapti");
                console.log(herkes);        
            });

            socket.on("ilkbaglanti", function(data){
                if (data.token == nodeJSBildirimToken && !isNaN(data.id))
                {
                    benim_ID = data.id;
                    herkes[socket.id] = {"id": data.id}
                    
                    vt.collection("genel").find({"id": data.id}).toArray(function(cerr, cres){
                        if (cerr){
                            console.log("Hata");
                        }
                        if (cres == "" || cerr){
                            console.log("Daha Once yoktu "+data.id);
                            vt.collection("genel").insertOne({id: data.id, sckid: socket.id, online: "1"},function(ierr, ires){});
                            vt.collection("duyuru").insertOne({id: data.id, sckid: socket.id, online: "1"},function(ierr, ires){});

                        }else
                        {
                            vt.collection("genel").updateOne({id: data.id}, {$set: {sckid: socket.id, online: "1"}});
                            vt.collection("duyuru").updateOne({id: data.id}, {$set: {online: "1"}});
                            console.log("zaten vardi", data.id);
                        }
                        

                    });
                    

                    vt.collection("genel").findOne({id: data.id}, function(err,res){
                        if (err) throw err;
                        if (res && res.ozelduyuruokundumu && res.ozelduyuruokundumu == "0")
                        {
                            console.log("+1 okunmamis Ozel duyurunuz var");
                            socket.emit("okunmamisozelduyuru", {
                                "olusturan": res.olusturan,
                                "mesaj": res.ozelduyuru,
                                "id": data.id
                            });
                        }
                    });

                    her_sckid.push(socket.id);

                    console.log(data.id+" "+socket.id+" ilk baglanti geldi");

                    console.log(herkes);

                    io.emit("online", {
                        "sckid": socket.id,
                        "id": data.id
                    });                 
                }
            });

            socket.on("ozelduyurugoruldu", function(data){
                console.log("Özel duyurugoruldu "+data.id);
                if (data.token == nodeJSBildirimToken)
                {
                    console.log("Ozel Duyuru Goruldu "+ data.id);
                    vt.collection("genel").updateOne({id: data.id}, {$set: {sckid: socket.id, ozelduyuruokundumu: "1"}});
                    console.log(data);
                    console.log("** Ozel Duyuru Son");
                    vt.collection("duyuru").updateOne({id: data.id, olusturan: data.olusturan, ozelduyuru: data.ozelduyuru}, {$set : {ozelduyuruokundumu: "1"}});
                }
            });


            socket.on("tumduyurularigoster", function(data){
                if (data.token == nodeJSBildirimToken){
                    console.log("Tum duyuru istegi: "+data.id+" "+data.token);

                    vt.collection("duyuru").find({id: data.id}).toArray(function(hata, sonuc){
                        console.log(sonuc);
                    });
                    
                }
            });



            socket.on("chatgecmisilistele", function(data){

console.log("chat geçmişi listeleme isteği:");
console.log(data);

            	if (data.token == nodeJSBildirimToken){
	            	console.log("Chat geçmişi listele");
	            	console.log(data);


                    var sorgu = {$or: [{$and: [{id: data.id}, {senderId: data.karsiid}]}, {$and: [{id: data.karsiid}, {senderId: data.id}]}]};
	    
                    //vt.collection("chatkayit").find({$or: [{id: data.id}, {id: data.ikinciid},{senderId: data.id}, {senderId: data.ikinciid}]}).toArray(function(cgL_hata, cgl_cikti){
                    vt.collection("chatkayit").find(sorgu).toArray(function(cgL_hata, cgl_cikti){
	            		
	            		console.log("Kişilerarası konuşmaları görme isteği alındı");
	            		console.log(cgl_cikti);

	            			var durum = 0;
	            			cgl_cikti.forEach(function(value, index){
	            				console.log(value.mesaj);

	            				// if (value.id == data.id && value.senderId == data.id || value.id == data.ikinciid && value.senderId == data.ikinciid)
	            				// {
	            				// 	durum = 1;
	            				// }
	            				// else
	            				// {
	            				// 	durum = 0;
	            				// 	return false;
	            				// }
	            			});
	            		

	        	  	             socket.emit("chatgecmisilistele", cgl_cikti);          			
	

	            	});
            	}

            });


            socket.on("chatgecmisigoster", function(data){



                if (data.id && Number.isInteger(data.id)){
                    data.id = data.id.toString();
                }

                console.log("data içeriği :");
                console.log(data);



            	if (data.token == nodeJSBildirimToken){
		                console.log("Chat geçmişini görme isteği geldi");

                            var sorgu = {$or: [{$and: [{id: data.id}, {senderId: data.karsiid}]}, {$and: [{id: data.karsiid}, {senderId: data.id}]}]};

			               	vt.collection("chatkayit").find(sorgu).count(function(c_hata, c_scikti){
			               	console.log("kayit sayısı");
			               	console.log(c_scikti);

			               	var kayit_sayisi = parseInt(parseInt(c_scikti)-parseInt(50));
			               	if (kayit_sayisi < 0)
			               	{
			               		kayit_sayisi = 0;
			               	}

			                // vt.collection("chatkayit").find({$or: [{id: data.id}, {id: data.karsiid},{senderId: data.id}, {senderId: data.karsiid}]}).sort({_id: 1}).skip(kayit_sayisi).limit(50).toArray(function(ck_hata, ck_cikti){
			                    
                   			// 	console.log(ck_cikti);

			                //     socket.emit("chatgecmisigoster", ck_cikti);
			                //     console.log("Chat geçmişi gönderildi");

			                // });

                            var sorgu = {$or: [{$and: [{id: data.id}, {senderId: data.karsiid}]}, {$and: [{id: data.karsiid}, {senderId: data.id}]}]}; 
                            vt.collection("chatkayit").find(sorgu).skip(kayit_sayisi).limit(50).toArray(function(ck_hata, ck_cikti){
                                
                                console.log(ck_cikti);

                                socket.emit("chatgecmisigoster", ck_cikti);
                                console.log("Chat geçmişi gönderildi");

                            });

		               });

            	}
            	else{
            			console.log("Token eşleşmiyor ya da yok");
            	}
            });


            socket.on("adminChat", function(data){

            	if (data.token == nodeJSBildirimToken){



		                            function addZero(i) {
		                                if (i < 10) {
		                                    i = "0" + i;
		                                }
		                                return i;
		                            }
		                            var d = new Date();
		                            var h = addZero(d.getHours());
		                            var m = addZero(d.getMinutes());
		                            var saat = h + ":" + m ;

		                            var g = addZero(d.getDate());
		                            var a = addZero(d.getMonth()+1);
		                            var y = addZero(d.getFullYear());

		                            var tarih =  g+ "." +a+ "." +y;

		                                            her_sckid.forEach(function(value, index){



		                                            if (herkes[value] && herkes[value]["id"] && herkes[value]["id"] == data.id)
		                                            {
		                                                console.log(data.id+" e ait socketID: "+value);

		                                                data["tarih"] = tarih;
		                                                data["saat"] = saat;
		                                                data["ip"] = ip.address();

		                                                delete data["token"];

		                                                if (data.mesaj.indexOf("?#")>-1){}else{vt.collection("chatkayit").insertOne(data);}

		                                                io.to(value).emit("adminChat", data);
		                                            }
		                                        }); 
		 



            	}



            });


            socket.on("yoneticiListesiGetir", function(data){
            	console.log("ON: yoneticiListesiGetir içine veri geldi.");
            	socket.emit("yoneticiListesiGetir", {herkes:herkes});
            });



        });




        express.json();
        app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


		

        app.get("/tumduyurular", function(req, res){
            var gelen = req.body;
            var token = gelen.token;
            var id = gelen.id;

            if (gelen && token && token == nodeJSBildirimToken){
                    console.log("Tum duyuru istegi: "+id);
                
                    vt.collection("duyuru").find({id: id}, {projection: {_id:0}}).toArray(function(hata, sonuc){
                    
                        res.send(sonuc);
                    });
                    
                    
            }
            else
            {
                res.send("Token bilgisi olmadan veri gonderemezsiniz");
            }

        });

        app.get("/okunmusduyurular", function(req, res){
            var gelen = req.body;
            var token = gelen.token;
            var id = gelen.id;

            if (gelen && token && token == nodeJSBildirimToken){
                    console.log("Tum duyuru istegi: "+id);
                
                    vt.collection("duyuru").find({id: id, ozelduyuruokundumu: "1"}, {projection: {_id:0}}).toArray(function(hata, sonuc){
                    
                        res.send(sonuc);
                    });
                    
                    
            }
            else
            {
                res.send("Token bilgisi olmadan veri gonderemezsiniz");
            }

        });


        app.get("/okunmamisduyurular", function(req, res){
            var gelen = req.body;
            var token = gelen.token;
            var id = gelen.id;

            if (gelen && token && token == nodeJSBildirimToken){
                    console.log("Tum duyuru istegi: "+id);
                
                    vt.collection("duyuru").find({id: id, ozelduyuruokundumu: "0"}, {projection: {_id:0}}).toArray(function(hata, sonuc){
                    
                        res.send(sonuc);
                    });
                    
                    
            }
            else
            {
                res.send("Token bilgisi olmadan veri gonderemezsiniz");
            }

        });





		app.get("/onlineyoneticigor", function(req, res){
		    var token = req.param("token");
		    if (token == nodeJSBildirimToken){
		        console.log("Online Yönetici Görme İSteği Geldi");
		    
		        res.send(herkes);        
		    }
		    else
		    {
		        res.send("Token bilgisi olmadan veri gonderemezsiniz");
		    }

		});

        app.get("/ozelduyuru", function(req,res){
            console.log("Özel duyuru isteği");
            
            var jsn = req.param("jsn");
            jsn = JSON.parse(jsn);


            var token = req.param("token");

            console.log(token);
                // var token = req.param("token");
                // var mesaj = req.param("mesaj");
                // console.log(req.param("kisiler"));

                if (jsn && token && token == nodeJSBildirimToken){
                        var kisiler = jsn.kisiler;
                        var olusturan = req.param("olusturan");
                        var mesaj = jsn.mesaj;


                        console.log("Ozel Duyuru Istegi: ");

                        // KISILER ADLI ARRAY DONGUYE SOKULUYOR..
                        kisiler.forEach(function(kindex, kvalue){
                                        vt.collection("genel").findOne({id: kindex}, function(err, res){

                                                // DAHA ONCE YOKSA EKLE
                                            if (res == null)
                                            {
                                                vt.collection("genel").insertOne({id: kindex, ozelduyuru: mesaj, olusturan: olusturan, ozelduyuruokundumu: "0"}, function(hata,cikti){});

                                                vt.collection("duyuru").insertOne({id: kindex, ozelduyuru: mesaj, olusturan: olusturan, ozelduyuruokundumu: "0"}, function(hata,cikti){});

                                            }
                                            else
                                            {
                                                //VARSA GUNCELLE
                                                vt.collection("genel").updateOne({id: kindex}, {$set: {ozelduyuru: mesaj, olusturan: olusturan, ozelduyuruokundumu: "0"}});
                                                vt.collection("duyuru").insertOne({id: kindex, ozelduyuru: mesaj, olusturan: olusturan, ozelduyuruokundumu: "0"}, function(hata,cikti){});
                                            }
                                        
                                        });
                        });
                        //ASENKRON YAPIDA MONGODB'YE YAZDIRMA.
                        kisiler.forEach(function(gindex, gvalue){
                                        
                                            her_sckid.forEach(function(index, value){
                                            if (herkes[index] && herkes[index]["id"] && herkes[index]["id"] == gindex)
                                            {

                                                io.to(index).emit("ozelduyuru", {
                                                    "id": gindex,
                                                    "mesaj": jsn.mesaj,
                                                    "olusturan": olusturan
                                                });
                                            }
                                        }); 
                        });             
                res.send("Mesaj Gonderildi");
                }
                else
                {
                    res.send("Token bilgisi olmadan veri gonderemezsiniz");
                }
        });
   
});
