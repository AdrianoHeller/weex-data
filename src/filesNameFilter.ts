import fs from 'fs';
import path from 'path';

const filesNameFilter = (fileName: string, empresa: string) => {
    const filesList = fs.readdirSync(path.join(__dirname,'../uploads'));

    const filteredImage = filesList.filter((names) => {
        if (names.includes(fileName)){
            if (!empresa && names.includes('_LOGO')){
                return names
            }
            if (empresa && names.includes(fileName)){
                return names
            }
        }
    })

    let filteredLogoImage = []
    
    if (empresa) {
        filteredLogoImage = filesList.filter(names => {
            if (names.includes(empresa)){
                if (names.includes('_LOGO')){
                    return names
                }
            }
        })
    
        const filteredImages = [...filteredLogoImage, ...filteredImage]

        return filteredImages
    
    }

    return filteredImage
}

export default filesNameFilter