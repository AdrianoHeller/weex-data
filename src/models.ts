const checkValidInputs = (listOfInterest:[]):{}[] => {
    let mappedList:{[key:string]:any}[] = [];
    Object.entries(listOfInterest).map(arrayItem => {
        let newItem = {
            [arrayItem[0]]: [arrayItem[1]]
        };
        mappedList.push(newItem);
    });
    return mappedList;
};

interface IUserProps{
    USER_ID: string
};

const checkSameUserPolicy = (userCommanderId: string, userToDeleteId: string):boolean => {
    if(userCommanderId === userToDeleteId){
        return false;
    }else{
        return true;
    };  
};

