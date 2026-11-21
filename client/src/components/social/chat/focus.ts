/** The conversation on screen right now: its messages need no pop-up alert. */
let open: number | null = null
export const setOpenConversation = (id: number | null) => {
  open = id
}
export const openConversation = () => open
