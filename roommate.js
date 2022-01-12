//importamos axios
const axios = require('axios')

//funcion asincrona que consume la api de randomuser y devuelve un nombre generado por la api
const getRoommate = async() => {
    const {data} = await axios.get('https://randomuser.me/api')
    const {name} = data.results[0]
    return name
}

//exportamos el modulo
module.exports = getRoommate