import fs from 'fs';
import path from 'path';

const filesNameFilter = (fileName: string) => {
    const filesList = fs.readdirSync(path.join(__dirname,'../uploads'));
    const filteredImage = filesList.filter((names) => {
        if (names.includes(fileName)){
            return names
        }
    })
    return filteredImage
}

export default filesNameFilter