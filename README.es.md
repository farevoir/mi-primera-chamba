# Buscador de Chamba

[English](README.md) · **Español**

Un asistente de búsqueda de empleo que corre dentro de [Claude Code](https://claude.com/claude-code). Encuentra vacantes abiertas que encajan con tu CV y prepara para cada una un CV adaptado y compatible con ATS. **Tú** decides a cuáles postularte y **tú** envías cada solicitud.

![Ejemplo de CV adaptado](docs/example-cv.png)
<sub>CV adaptado de una candidata ficticia, generado a partir de [`example/`](example/).</sub>

## Por qué existe

Las herramientas de "auto-apply" envían cientos de solicitudes genéricas o infladas con IA a tu nombre. Los reclutadores las marcan como spam y casi no consiguen entrevistas. Este proyecto hace lo contrario:

| Bots de auto-apply | Buscador de Chamba |
|---|---|
| Aplican por ti, en masa | Prepara; **tú** aplicas |
| Reescriben tu experiencia libremente | **Cada afirmación tiene respaldo** en tu CV real o en una habilidad que confirmaste |
| Cientos de solicitudes sin enfoque | 5–10 vacantes verificadas y ordenadas por búsqueda |
| Tus datos en sus servidores | Tus datos se quedan en una carpeta local que Git ignora |

## Qué hace

1. **Aprende tu perfil.** Lee tu CV y te hace unas preguntas: puestos que buscas, países donde puedes trabajar, salario mínimo y lo que descartas.
2. **Busca vacantes.** Revisa bolsas de empleo remoto y páginas de carreras. Comprueba que cada vacante siga abierta y que seas elegible, y las ordena por *afinidad* (1–5).
3. **Adapta tu CV.** Para la vacante que elijas, relaciona cada requisito con tu experiencia y te pregunta por las habilidades que faltan, en vez de inventarlas. Después genera un PDF de una página, con texto real y a una columna, legible para los ATS.
4. **Lleva el registro.** Anota cada vacante vista para no repetírtela y te avisa qué postulaciones necesitan seguimiento.

## Requisitos

- [Claude Code](https://claude.com/claude-code), que requiere suscripción Claude Pro/Max o una API key
- [Node.js](https://nodejs.org) 18 o superior
- Google Chrome, Microsoft Edge, Chromium o Brave, que se usa en modo headless para imprimir el PDF
- Windows, macOS o Linux

## Inicio rápido

```bash
git clone https://github.com/farevoir/buscador-chamba.git
cd buscador-chamba
claude
```

Luego háblale normal, en cualquier idioma:

| Tú dices | Qué pasa |
|---|---|
| *"Configura mi perfil, aquí está mi CV: C:\Users\yo\Descargas\cv.pdf"* | `setup-profile` crea tu carpeta privada `my-data/` |
| *"Busca vacantes"* | `find-jobs` te da una lista de vacantes verificadas, ordenadas por afinidad |
| *"Hazme un CV para esta vacante: <enlace o texto>"* | `tailor-cv` genera un PDF adaptado y notas para la entrevista |
| *"Ya apliqué a Acme"* / *"¿Cómo va mi búsqueda?"* | `track-applications` actualiza estados y te dice a qué darle seguimiento |

¿Quieres ver el resultado antes? Revisa [`example/`](example/). Ahí están el perfil, el registro y el CV adaptado de una candidata ficticia.

## Úsalo desde el celular

Inicia Claude Code en tu computadora y activa **Remote Control**. Desde ese momento lo puedes manejar con la app de Claude o desde claude.ai. El trabajo lo hace tu computadora, así que tiene que quedarse encendida y sin suspenderse. Claude te puede mandar los PDF al celular para que apliques desde ahí.

## Estructura

```
.claude/skills/         Las cuatro skills (setup-profile, find-jobs, tailor-cv, track-applications)
scripts/html-to-pdf.mjs HTML → PDF con un navegador Chromium local, sin dependencias
templates/              Archivos de perfil vacíos y plantilla del CV
example/                Candidata ficticia con todos los resultados
GLOSSARY.md             Vocabulario compartido (afinidad, hueco, por verificar…)
my-data/                TUS datos: CV, perfil, postulaciones, CVs adaptados (ignorado por Git)
```

También puedes generar cualquier CV a mano:

```bash
node scripts/html-to-pdf.mjs my-data/cv.html
```

## Privacidad

- Todo lo personal vive en `my-data/`, que está en `.gitignore`. Hacer push de tu fork nunca publica tu CV.
- Mientras lo usas, Claude Code envía tu CV y las vacantes a la API de Anthropic para procesarlos. Las búsquedas y las consultas de páginas van a los sitios de empleo. No se sube nada más.
- Nunca se envía nada a un empleador. Tú mandas cada solicitud.

## Límites

- LinkedIn e Indeed bloquean la lectura automática. Si pegas el texto de la vacante, el CV se adapta igual.
- Las bolsas de empleo tienen muchas vacantes viejas. Calcula que sobreviven a la verificación unos 2 de cada 7 resultados.
- Muchas vacantes no publican el salario. Esas quedan **por verificar** en lugar de descartarse.
- La plantilla del CV es sencilla a propósito. Los ATS leen mejor los diseños de una columna con texto real.

## Personalizar

- **Criterios:** edita `my-data/search-profile.md` o di *"cambia mis criterios de búsqueda"*.
- **Diseño del CV:** edita `templates/cv-template.html` antes de configurar tu perfil, o `my-data/cv.html` después. Mantenlo a una columna.
- **Mejores fuentes para tu país:** `find-jobs` anota lo que funcionó en la sección "Source notes" de tu perfil.

## Licencia

[MIT](LICENSE). Úsalo para tu propia búsqueda, haz fork y adáptalo. Solo te pido que respetes la idea de que una persona decide: no lo conviertas en un bot de auto-apply.
