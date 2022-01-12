//importamos nodemailer
const nodemailer = require('nodemailer')

//funcion que se encargara de enviar un correo con los datos proporcionados
const enviarCorreo = () => {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'nodemailerADL2@gmail.com',
                pass: 'desafiolatam'
            }
        })
        
        const mailOptions = {
            from: 'nodemailerADL2@gmail.com',
            to: ['c.e.chappa@gmail.com'],
            subject: 'NUEVO GASTO AGREGADO',
            html: '<h3>Nuevo Gasto Agregado</h3><br><p>Ingrese al sitio para averiguar mas detalles!</p>'
        }
        
        transporter.sendMail(mailOptions, (err, data) => {
            if(err) console.error(err)
            if(data) console.log(data)
        })
}

//hacemos el modulo exportable
module.exports = enviarCorreo