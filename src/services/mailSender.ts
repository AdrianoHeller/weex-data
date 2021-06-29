import sender from '../modules/mailer';

const sendMail = async(email: string, origin: string, template: any, context: any): Promise<any> => {
    try{
        sender.sendMail({
            from: origin,
            html: template,
            sender: origin,
            to: email,
            watchHtml: context    
        })
    }catch(err){
      throw new Error(err);
    }
};

export default sendMail;