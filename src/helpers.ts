export const interpolateBirthDate = (birthDate:string) => {
    if(birthDate.includes('/') && birthDate.length === 10){
        const arrayDate = birthDate.split('/');
        const day = arrayDate[0];
        const month = arrayDate[1];
        const year = arrayDate[2];
        return `${month}/${day}/${year}`;
    }else if(birthDate.includes('-') && birthDate.length === 10){
        const arrayDate = birthDate.split('-');
        const day = arrayDate[0];
        const month = arrayDate[1];
        const year = arrayDate[2];
        return `${month}/${day}/${year}`;
    }else if(birthDate.length < 10){
        if(['0','1','2','3'].includes(birthDate[0]) && + birthDate[1] > 3 ){

        }
    }
};