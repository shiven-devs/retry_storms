import express , { type Express, type Request, type Response } from "express";


const app: Express = express();
const port = 3000;
const serviceName = process.env.SERVICE_NAME;

if (!serviceName) {
  throw new Error("SERVICE_NAME env variable is not set");
}



app.get('/work',(req:Request,res:Response)=>{
    res.json({"serviceName": serviceName });
})

app.listen(port,()=>{
    console.log(`server is listening on port:${port}`)
});