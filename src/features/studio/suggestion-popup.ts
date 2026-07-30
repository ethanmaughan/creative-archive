/** A minimal dropdown for editor autocomplete (no popup library). Positioned at the caret;
 *  keyboard-navigable. Reused for `[[` (documents) and `#` (tags). */

export interface SuggestionItem {
  /** Text shown in the dropdown. */
  readonly label: string
  /** Text inserted when chosen (replaces the trigger + query). */
  readonly insertText: string
}

export class SuggestionPopup {
  private readonly el: HTMLDivElement
  private items: SuggestionItem[] = []
  private selected = 0
  private onCommand: (item: SuggestionItem) => void = () => undefined

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'suggestion-popup'
    document.body.appendChild(this.el)
  }

  update(
    items: SuggestionItem[],
    onCommand: (item: SuggestionItem) => void,
    rect: DOMRect | null,
  ): void {
    this.items = items
    this.onCommand = onCommand
    if (this.selected >= items.length) this.selected = 0
    this.el.style.display = items.length === 0 ? 'none' : 'block'
    if (rect) {
      this.el.style.top = `${rect.bottom + 4}px`
      this.el.style.left = `${rect.left}px`
    }
    this.render()
  }

  private render(): void {
    this.el.textContent = ''
    this.items.forEach((item, i) => {
      const row = document.createElement('div')
      row.className = `suggestion-item${i === this.selected ? ' is-selected' : ''}`
      row.textContent = item.label
      row.addEventListener('mousedown', (event) => {
        event.preventDefault()
        this.onCommand(item)
      })
      this.el.appendChild(row)
    })
  }

  onKeyDown(event: KeyboardEvent): boolean {
    if (this.items.length === 0) return false
    if (event.key === 'ArrowDown') {
      this.selected = (this.selected + 1) % this.items.length
      this.render()
      return true
    }
    if (event.key === 'ArrowUp') {
      this.selected = (this.selected - 1 + this.items.length) % this.items.length
      this.render()
      return true
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      const item = this.items[this.selected]
      if (item) this.onCommand(item)
      return true
    }
    return false
  }

  destroy(): void {
    this.el.remove()
  }
}
