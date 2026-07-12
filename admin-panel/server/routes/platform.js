const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { requireUser } = require('../middleware/userAuth');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

const Review = mongoose.models.Review || mongoose.model('Review', new mongoose.Schema({
  spotId:{type:String,required:true,index:true}, user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  userName:{type:String,required:true}, rating:{type:Number,required:true,min:1,max:5}, comment:{type:String,required:true,maxlength:1200},
  status:{type:String,enum:['pending','approved','rejected'],default:'pending',index:true}
},{timestamps:true}));
const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', new mongoose.Schema({
  owner:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true}, name:{type:String,required:true,maxlength:80},
  items:{type:[String],default:[]}, shareToken:{type:String,unique:true,index:true}, public:{type:Boolean,default:false}
},{timestamps:true}));
const PartnerSubmission = mongoose.models.PartnerSubmission || mongoose.model('PartnerSubmission', new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true}, businessName:{type:String,required:true}, category:{type:String,required:true},
  city:{type:String,required:true}, address:{type:String,required:true}, contact:{type:String,required:true}, description:{type:String,default:''},
  status:{type:String,enum:['pending','approved','rejected'],default:'pending',index:true}, adminNote:{type:String,default:''}
},{timestamps:true}));
const AnalyticsEvent = mongoose.models.AnalyticsEvent || mongoose.model('AnalyticsEvent', new mongoose.Schema({
  type:{type:String,required:true,index:true}, spotId:{type:String,default:'',index:true}, city:{type:String,default:'',index:true},
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null}, meta:{type:mongoose.Schema.Types.Mixed,default:{}}
},{timestamps:true}));
const Itinerary = mongoose.models.Itinerary || mongoose.model('Itinerary', new mongoose.Schema({
  owner:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true}, name:{type:String,required:true,maxlength:100},
  city:{type:String,default:''}, date:{type:String,default:''}, startTime:{type:String,default:'09:00'},
  travelMode:{type:String,enum:['driving','walking','bicycling','transit'],default:'driving'},
  items:{type:[{spotId:{type:String,required:true},order:{type:Number,default:0},durationMinutes:{type:Number,default:90,min:15,max:720},notes:{type:String,default:'',maxlength:500}}],default:[]},
  shareToken:{type:String,unique:true,index:true}, public:{type:Boolean,default:false}
},{timestamps:true}));
const token = () => crypto.randomBytes(18).toString('base64url');

router.get('/reviews/:spotId',async(req,res)=>res.json(await Review.find({spotId:req.params.spotId,status:'approved'}).sort({createdAt:-1}).limit(100).lean()));
router.post('/reviews/:spotId',requireUser,async(req,res)=>{
  const User=mongoose.model('User'),user=await User.findById(req.userId),rating=Number(req.body.rating),comment=String(req.body.comment||'').trim();
  if(!user||rating<1||rating>5||comment.length<5)return res.status(400).json({error:'Informe uma nota e um comentário com pelo menos 5 caracteres.'});
  const review=await Review.findOneAndUpdate({spotId:req.params.spotId,user:req.userId},{userName:user.name,rating,comment,status:'pending'},{upsert:true,new:true,setDefaultsOnInsert:true});
  res.status(201).json({review,message:'Avaliação enviada para moderação.'});
});

router.get('/wishlists',requireUser,async(req,res)=>res.json(await Wishlist.find({owner:req.userId}).sort({updatedAt:-1})));
router.post('/wishlists',requireUser,async(req,res)=>{const name=String(req.body.name||'').trim();if(!name)return res.status(400).json({error:'Dê um nome à lista.'});res.status(201).json(await Wishlist.create({owner:req.userId,name,shareToken:token()}))});
router.put('/wishlists/:id',requireUser,async(req,res)=>{const update={};if(req.body.name!=null)update.name=String(req.body.name).trim();if(Array.isArray(req.body.items))update.items=req.body.items.slice(0,100);if(req.body.public!=null)update.public=!!req.body.public;const list=await Wishlist.findOneAndUpdate({_id:req.params.id,owner:req.userId},update,{new:true});if(!list)return res.status(404).json({error:'Lista não encontrada.'});res.json(list)});
router.delete('/wishlists/:id',requireUser,async(req,res)=>{await Wishlist.deleteOne({_id:req.params.id,owner:req.userId});res.json({ok:true})});
router.get('/shared/:token',async(req,res)=>{const list=await Wishlist.findOne({shareToken:req.params.token,public:true}).select('name items updatedAt');if(!list)return res.status(404).json({error:'Lista não encontrada.'});res.json(list)});

router.get('/itineraries',requireUser,async(req,res)=>res.json(await Itinerary.find({owner:req.userId}).sort({updatedAt:-1})));
router.post('/itineraries',requireUser,async(req,res)=>{const name=String(req.body.name||'').trim();if(!name)return res.status(400).json({error:'Dê um nome ao roteiro.'});res.status(201).json(await Itinerary.create({owner:req.userId,name,city:req.body.city||'',date:req.body.date||'',startTime:req.body.startTime||'09:00',travelMode:req.body.travelMode||'driving',shareToken:token()}))});
router.put('/itineraries/:id',requireUser,async(req,res)=>{const allowed={};for(const k of ['name','city','date','startTime','travelMode','public'])if(req.body[k]!=null)allowed[k]=req.body[k];if(Array.isArray(req.body.items))allowed.items=req.body.items.slice(0,25).map((x,i)=>({spotId:String(x.spotId),order:i,durationMinutes:Number(x.durationMinutes)||90,notes:String(x.notes||'')}));const item=await Itinerary.findOneAndUpdate({_id:req.params.id,owner:req.userId},allowed,{new:true,runValidators:true});if(!item)return res.status(404).json({error:'Roteiro não encontrado.'});res.json(item)});
router.delete('/itineraries/:id',requireUser,async(req,res)=>{await Itinerary.deleteOne({_id:req.params.id,owner:req.userId});res.json({ok:true})});
router.get('/itinerary/:token',async(req,res)=>{const item=await Itinerary.findOne({shareToken:req.params.token,public:true}).select('-owner');if(!item)return res.status(404).json({error:'Roteiro não encontrado.'});res.json(item)});

router.post('/partners',requireUser,async(req,res)=>{const b=req.body;if(!b.businessName||!b.category||!b.city||!b.address||!b.contact)return res.status(400).json({error:'Preencha empresa, categoria, cidade, endereço e contato.'});res.status(201).json(await PartnerSubmission.create({...b,user:req.userId,status:'pending'}))});
router.get('/partners/mine',requireUser,async(req,res)=>res.json(await PartnerSubmission.find({user:req.userId}).sort({createdAt:-1})));
router.post('/events',async(req,res)=>{const type=String(req.body.type||'');if(!['view','favorite','search','route','signup'].includes(type))return res.status(400).json({error:'Evento inválido.'});await AnalyticsEvent.create({type,spotId:req.body.spotId||'',city:req.body.city||'',meta:req.body.meta||{}});res.status(204).end()});

router.get('/admin/reviews',requireAuth,async(req,res)=>res.json(await Review.find({}).sort({createdAt:-1}).limit(300)));
router.patch('/admin/reviews/:id',requireAuth,async(req,res)=>res.json(await Review.findByIdAndUpdate(req.params.id,{status:req.body.status},{new:true})));
router.get('/admin/partners',requireAuth,async(req,res)=>res.json(await PartnerSubmission.find({}).sort({createdAt:-1}).limit(300)));
router.patch('/admin/partners/:id',requireAuth,async(req,res)=>{const submission=await PartnerSubmission.findByIdAndUpdate(req.params.id,{status:req.body.status,adminNote:req.body.adminNote||''},{new:true});if(submission&&req.body.status==='approved')await mongoose.model('User').findByIdAndUpdate(submission.user,{role:'partner'});res.json(submission)});
router.get('/admin/metrics',requireAuth,async(req,res)=>{const since=new Date(Date.now()-30*86400000),byType=await AnalyticsEvent.aggregate([{$match:{createdAt:{$gte:since}}},{$group:{_id:'$type',count:{$sum:1}}}]),topSpots=await AnalyticsEvent.aggregate([{$match:{createdAt:{$gte:since},spotId:{$ne:''}}},{$group:{_id:'$spotId',count:{$sum:1}}},{$sort:{count:-1}},{$limit:10}]),User=mongoose.model('User');res.json({periodDays:30,events:byType,topSpots,users:await User.countDocuments(),pendingReviews:await Review.countDocuments({status:'pending'}),pendingPartners:await PartnerSubmission.countDocuments({status:'pending'})})});
module.exports=router;
