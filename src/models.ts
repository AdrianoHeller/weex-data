const checkValidInputs = (listOfInterest:[]) => {
    let mappedList:{[key:string]:any}[] = [];
    Object.entries(listOfInterest).map(arrayItem => {
        let newItem = {
            [arrayItem[0]]: [arrayItem[1]]
        };
        mappedList.push(newItem);
    });
    return mappedList;
};