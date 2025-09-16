import '@mui/material/styles'

declare module '@mui/material/styles' {
    interface Palette {
        customColors: {
            blue_1: string
            blue_2: string
            blue_3: string
            blue_4: string
            blue_5: string

            green_1: string
            green_2: string
            green_3: string
            green_4: string
            green_5: string

            red_1: string
            red_2: string
            red_3: string
            red_4: string
            red_5: string

            yellow_1: string
            yellow_2: string
            yellow_3: string
            yellow_4: string
            yellow_5: string

            orange_1: string
            orange_2: string
            orange_3: string
            orange_4: string
            orange_5: string

            grey_1: string
            grey_2: string
            grey_3: string
            grey_4: string
            grey_5: string
            grey_6: string

            purple_1: string
            purple_2: string
            purple_3: string
            purple_4: string
            purple_5: string

            teal_1: string
            teal_2: string
            teal_3: string
            teal_4: string
            teal_5: string
        }
    }

    interface PaletteOptions {
        customColors?: Palette['customColors']
    }
}
