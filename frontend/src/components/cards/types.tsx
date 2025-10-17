import type { AlertColor } from '@mui/material/Alert'

export type Category = {
    id: number
    name: string
    color?: string
    image_url?: string | null
}

export type CardModel = {
    id: number
    name: string
    description: string
    rating: number | 0
    image_url?: string | null // fixed typing
    categories: Category[]
}

export type CategoryPickerProps = {
    open: boolean
    anchorEl: HTMLElement | null
    onClose: () => void
    allCategories: Category[]
    selectedIds: number[]
    onApply: (newIds: number[]) => void
    maxSelection?: number // per-card: 4, filter: Infinity
    title?: string
}

export type CardDialogProps = {
    open: boolean
    mode: 'add' | 'edit'
    initial?: Partial<CardModel>
    allCategories: Category[]
    onCancel: () => void
    onNotify: (message: string, severity: AlertColor) => void
    onSave: (payload: {
        name: string
        description: string
        image_url?: string | null
        category_ids?: number[]
    }) => Promise<void>
}

export type CardTileProps = {
    card: CardModel
    allCategories: Category[]
    loadingRating: boolean
    disableActions: boolean
    onRequestEdit: (card: CardModel) => void
    onRequestDelete: (card: CardModel) => void
    onApplyCategories: (cardId: number, newCategoryIds: number[]) => Promise<void>
    onApplyRating: (card: CardModel) => Promise<void>
}
