interface JSONWidget {
  type: number;
  options: { [key: string]: string };
}

class Widget extends HTMLElement {
  type: number;
  options: { [key: string]: string };

  constructor(type: number, options: { [key: string]: string } = {}) {
    super();

    this.type = type;
    this.options = options;
  }

  static fromJSON(json: JSONWidget): Widget {
    return new Widget(json.type, json.options);
  }

  toJSON(): JSONWidget {
    return { type: this.type, options: this.options };
  }
}

window.customElements.define("ntab-widget", Widget);

/**
 * Read widget list from memory as `JSONWidget[]`
 * If the memory is corrupted, ask user if they want to reset it.
 * @returns The widgets from memory, null if memory is corrupted and the user declines the reset
 */
function getStoredWidgets(): JSONWidget[] | null {
  let json: string | null = localStorage.getItem("widgets");
  try {
    return JSON.parse(json == null ? "[]" : json);
  } catch (e) {
    return window.confirm(
      "An error occurred while reading the saved widgets list.\nWould you like to reset it?\n" +
        String(e)
    )
      ? _overwriteStoredWidgets([])
      : null;
  }
}

/**
 * Overwrite the currently stored list of widgets
 * @param widgets List of widgets to save
 * @returns `<widgets>` parameter
 */
function _overwriteStoredWidgets(widgets: JSONWidget[]): JSONWidget[] {
  localStorage.setItem("widgets", JSON.stringify(widgets));
  return widgets;
}

/**
 * Remove widget at id `<id>` from memory
 * @param id The widget id to remove
 * @returns The updated list of widgets
 */
function removeStoredWidget(id: number): JSONWidget[] {
  let widgets: JSONWidget[] = getStoredWidgets()!;
  widgets.splice(id, 1);
  return _overwriteStoredWidgets(widgets);
}

/**
 * Save widget to memory at position `<offset>`
 * @param widget The widget object to save
 * @param offset The position at which to insert the widget, default -1 (last)
 * @returns The updated list of widgets
 */
function insertWidget(widget: JSONWidget, offset?: number): JSONWidget[] {
  let widgets: JSONWidget[] = getStoredWidgets()!;
  if (offset == undefined) widgets.push(widget);
  else widgets.splice(offset, 0, widget);
  return _overwriteStoredWidgets(widgets);
}

_overwriteStoredWidgets([]); // Clear stored widget memory
insertWidget(new Widget(2).toJSON()); // Create DateWidget object
insertWidget(new Widget(1).toJSON()); // Create TimeWidget object
insertWidget(new Widget(1, { "12h": "true" }).toJSON()); // Create TimeWidget object with options
console.log(getStoredWidgets()); // Print saved objects

getStoredWidgets()!.forEach((json: JSONWidget) => {
  let widget = Widget.fromJSON(json);
  document.body.appendChild(widget);
});
