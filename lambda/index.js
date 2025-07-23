const Alexa = require('ask-sdk-core');
const axios = require('axios');
const aplDocument = require('./apl/DetalleEjercicioAPL.json');

const SeleccionarEntrenamientoIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SeleccionarEntrenamientoIntent';
  },
  async handle(handlerInput) {
    const tipo_entrenamiento = Alexa.getSlotValue(handlerInput.requestEnvelope, 'tipo_entrenamiento');

    try {
      const response = await axios.get('https://backend-beatboxbackend.qvmevn.easypanel.host/playlists/all');
      const playlists = response.data;

      const playlist = playlists.find(p => p.tipo.toLowerCase() === tipo_entrenamiento.toLowerCase() && p.vigente);

      if (!playlist) {
        const speech = `Lo siento, no encontré una playlist vigente para ${tipo_entrenamiento}.`;
        return handlerInput.responseBuilder
          .speak(speech)
          .getResponse();
      }

      // Si el dispositivo soporta APL, mostrar la interfaz
      if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
        handlerInput.responseBuilder.addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          token: 'playlistToken',
          document: aplDocument,
          datasources: {
            payload: {
              tipo: playlist.tipo,
              nombre: playlist.nombre,
              url: playlist.url
            }
          }
        });
      }

      const speech = `Aquí tienes la playlist para ${playlist.tipo}: ${playlist.nombre}. Puedes abrirla en tu pantalla.`;
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt('¿Quieres otra playlist?')
        .getResponse();
    } catch (error) {
      console.error('Error al obtener playlists:', error.message);
      return handlerInput.responseBuilder
        .speak('Hubo un problema al buscar la playlist. Inténtalo más tarde.')
        .getResponse();
    }
  }
};

const APLUserEventHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent';
  },
  handle(handlerInput) {
    const args = handlerInput.requestEnvelope.request.arguments;

    if (args[0] === 'abrir_url' && args[1]) {
      return handlerInput.responseBuilder
        .addDirective({
          type: 'Alexa.Presentation.APL.ExecuteCommands',
          token: 'playlistToken',
          commands: [
            {
              type: 'OpenURL',
              source: args[1]
            }
          ]
        })
        .getResponse();
    }

    return handlerInput.responseBuilder.getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = 'Puedes decir por ejemplo: "quiero una playlist para fuerza"';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speakOutput = '¡Hasta luego!';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(`Error handled: ${error.message}`);
    const speakOutput = 'Lo siento, ocurrió un error. Inténtalo otra vez.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    SeleccionarEntrenamientoIntentHandler,
    APLUserEventHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
