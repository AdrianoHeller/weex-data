export const interpolateBirthDate = (birthDate:string) => {
    if(birthDate.includes('/')){
        const arrayDate = birthDate.split('/');
        const day = arrayDate[0];
        const month = arrayDate[1];
        const year = arrayDate[2];
        return `${month}/${day}/${year}`;    
    }else{
        const day = birthDate.substring(0,2);
        const month = birthDate.substring(2,4);   
        const year = birthDate.substring(4,8);
        return `${month}/${day}/${year}`;
    };
};