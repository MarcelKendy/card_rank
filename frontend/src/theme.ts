import { createTheme } from '@mui/material/styles'
import {
    blue, green, red, yellow, orange, grey, purple, teal
} from '@mui/material/colors'

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: blue[500] },
        secondary: { main: green[400] },
        success: { main: green[500] },
        error: { main: red[500] },
        info: { main: blue[300] },
        warning: { main: orange[400] },
        background: {
            default: 'rgb(20, 20, 25)',
            paper: grey[800],
        },
        customColors: {
            blue_1: blue[100],
            blue_2: blue[300],
            blue_3: blue[500],
            blue_4: blue[700],
            blue_5: blue[900],

            green_1: green[100],
            green_2: green[300],
            green_3: green[500],
            green_4: green[700],
            green_5: green[900],

            red_1: red[100],
            red_2: red[300],
            red_3: red[500],
            red_4: red[700],
            red_5: red[900],

            yellow_1: yellow[100],
            yellow_2: yellow[300],
            yellow_3: yellow[500],
            yellow_4: yellow[700],
            yellow_5: yellow[900],

            orange_1: orange[100],
            orange_2: orange[300],
            orange_3: orange[500],
            orange_4: orange[700],
            orange_5: orange[900],

            grey_1: grey[100],
            grey_2: grey[300],
            grey_3: grey[500],
            grey_4: grey[700],
            grey_5: grey[800],
            grey_6: grey[900],

            purple_1: purple[100],
            purple_2: purple[300],
            purple_3: purple[500],
            purple_4: purple[700],
            purple_5: purple[900],

            teal_1: teal[100],
            teal_2: teal[300],
            teal_3: teal[500],
            teal_4: teal[700],
            teal_5: teal[900],
        },
    },
})

export default theme
