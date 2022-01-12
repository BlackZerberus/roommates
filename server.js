//imports
const http = require('http')
const url = require('url')
const fs = require('fs')
const {v4: uuidv4} = require('uuid')
const getRoommate = require('./roommate')
const enviarCorreo = require('./mailer')

//server
http
.createServer((req, res) => {
    const {method} = req
    
    //endpoints get
    if(method === 'GET') {
        //ruta /
        if(req.url === '/') {
            try {
                const html = fs.readFileSync('index.html', 'utf-8')
                res.setHeader('Content-Type','text/html')
                res.statusCode = 200
                res.end(html)
            }
            catch (error) {
                res.statusCode = 500
                res.end()
                console.error(error)
            }
        }
        // roommates sirve el JSON con los roommates guardados
        else if(req.url ==='/roommates')  {
            try {
                const json = fs.readFileSync('roommates.json', 'utf-8')
                res.statusCode = 200
                res.setHeader('Content-Type','application/json')
                res.end(json)
            } catch (error) {
                res.statusCode = 500
                res.end()   
            }
        }
        // gastos sirve el JSON con los gastos almacenados
        else if(req.url === '/gastos') {
            try {
                const json = fs.readFileSync('gastos.json', 'utf-8')
                res.setHeader('Content-Type','application/json')
                res.statusCode = 200
                res.end(json)
            } catch (error) {
                res.statusCode = 500
                res.end() 
            }
        }
    }

    //endpoints POST
    else if(method === 'POST') {
        // roommate llama a getRoommate, que obtiene el nombre de la api randomuser
        //luego con uuid asignamos un id unico y finalmente, ponemos debe y recibe con datos numericos
        //luego el registro es almacenado en el JSON roommates.
        if(req.url === '/roommate') {
            try {
                req.on('data', (body) => body)
                req.on('end', () => {
                    getRoommate()
                    .then(data => {
                        const json = JSON.parse(fs.readFileSync('roommates.json', 'utf-8'))
                        const roommate = {
                            id: `${uuidv4().slice(30)}`,
                            nombre: `${data.first} ${data.last}`,
                            debe: 0,
                            recibe: Math.floor(Math.random() * 100000),
                        }
                        json.roommates.push(roommate)
                        fs.writeFileSync('roommates.json', JSON.stringify(json))
                        res.statusCode = 201
                        res.end(JSON.stringify(json))
                    })
                })
                
            } catch (error) {
                res.statusCode = 502
                res.end('operacion abortada, ha ocurrido un error, vuelva a intentarlo mas tarde.')
                console.error(error)
            }
        }
        // gasto almacena un registro nuevo en gastos.json con los datos proporcionados en el payload
        else if(req.url === '/gasto') {
            try {
                let body = '' 
                req.on('data', payload => {
                    //guardamos en body los datos formateados del payload
                    body = JSON.parse(payload)
                })
                req.on('end', () => {
                    //cargamos el json
                    const json = JSON.parse(fs.readFileSync('gastos.json','utf-8'))
                    //creamos un id para el registro
                    body.id = uuidv4().slice(30)
                    //agregamos al array el registro
                    json.gastos.push(body)
                    //finalmente guardamos el json con los cambios
                    fs.writeFileSync('gastos.json', JSON.stringify(json))

                    //cargamos el json de roommates 
                    const data = JSON.parse(fs.readFileSync('roommates.json','utf-8'))
                    //actualizamos el monto del roommate
                    data.roommates = data.roommates.map(registro => {
                        if(registro.nombre === body.roommate) {
                            registro.debe -= body.monto
                            return registro
                        }
                        return registro
                    })
                    //guardamos el json con los cambios
                    fs.writeFileSync('roommates.json', JSON.stringify(data))
                    //enviamos el email
                    enviarCorreo()

                    res.statusCode = 201
                    res.end()
                })

            } catch (error) {
                res.statusCode = 500
                res.end()
                console.error(error)
            }
        }
    }

    //endpoint PUT
    else if(method === 'PUT') {
        // gasto actualiza un registro ya creado buscando por su id
        if (req.url.startsWith('/gasto')) {
            const {id} = url.parse(req.url, true).query
            let body = ''
            let diferencia = 0
            try {
                req.on('data', payload => {
                    body = JSON.parse(payload)
                })
                req.on('end', () => {
                    const json = JSON.parse(fs.readFileSync('gastos.json','utf-8'))
                    json.gastos = json.gastos.map(gasto => {
                        if(gasto.id == id) {
                            body.id = id
                            diferencia = gasto.monto - body.monto
                            return body
                        }
                        else {
                            return gasto
                        }
                    })
                    fs.writeFileSync('gastos.json', JSON.stringify(json))

                    //reflejamos los cambios tambien en el json de roommates
                    const data = JSON.parse(fs.readFileSync('roommates.json', 'utf-8'))
                    data.roommates = data.roommates.map(registro => {
                        if(registro.nombre === body.roommate) {
                            registro.debe += diferencia
                            return registro
                        }
                        return registro
                    })
                    fs.writeFileSync('roommates.json', JSON.stringify(data))

                    res.statusCode = 201
                    res.end()
                })
            } catch (error) {
                res.statusCode = 500
                res.end()
                console.error(error)
            }
        }
    }

    //endpoint DELETE
    else if(method === 'DELETE') {
        // gasto elimina un registro en gastos.json buscando su id
        if( req.url.startsWith('/gasto')) {
            let body = ''
            try {
                //obtenemos la id via url y la filtramos con url.parse
                const {id} = url.parse(req.url, true).query
                //cargamos el json
                const json = JSON.parse(fs.readFileSync('gastos.json','utf-8'))
                //antes de eliminar el registro, guardamos en body el registro a eliminar para poder usar su dato de monto
                //y poder descontarlo despues del roommate
                body = json.gastos.find(gasto => gasto.id == id)
                //ahora si filtramos el objeto a eliminar
                json.gastos = json.gastos.filter(gasto => gasto.id !== id)
                // y guardamos el sjon actualizado
                fs.writeFileSync('gastos.json', JSON.stringify(json))

                //ahora solo resta actualizar la deuda del roomate descontando el monto borrado del historial a la deuda total
                const data = JSON.parse(fs.readFileSync('roommates.json', 'utf-8'))
                data.roommates = data.roommates.map(registro => {
                    if(registro.nombre === body.roommate) {
                        registro.debe += body.monto
                        return registro
                    }
                    return registro
                })
                //actualizamos el json
                fs.writeFileSync('roommates.json', JSON.stringify(data))

                res.statusCode = 204
                res.end()   
            } catch (error) {
                res.statusCode = 500
                res.end()
                console.error(error)
            }
        }
    }
    
})
.listen(3000, () => console.log('server up!'))