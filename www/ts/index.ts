/**
 * Merges two or more string-key objects into one
 * @param objects The objects to merge
 * @returns The merged result
 */
function mergeStringObjects(...objects: { [key: string]: any }[]): {
  [key: string]: any;
} {
  let out: { [key: string]: any } = {};
  objects.forEach((object: { [key: string]: any }) => {
    Object.keys(object).forEach((key: string) => {
      out[key] = object[key];
    });
  });
  return out;
}

interface WidgetOptions {
  [key: string]: string | number | boolean | null;
}

/**
 * Base JSON Widget, used in memory
 */
interface JSONWidget {
  type: number;
  options: WidgetOptions;
}

/**
 * Base Widget class
 */
class Widget extends HTMLElement {
  /** The type of widget */
  type: number;
  /** The widget options */
  options: WidgetOptions = {};

  static defaults: WidgetOptions = {};

  constructor(type: number, options: WidgetOptions = {}) {
    super();

    this.type = type;
    this.classList.add("widget-" + this.type.toString());
    // @ts-ignore
    this.options = mergeStringObjects(this.constructor.defaults, options);

    //! Placeholder / Test code
    this.innerText = JSON.stringify(this.toJSON());
  }

  static fromJSON(json: JSONWidget): Widget {
    return new Widget(json.type, json.options);
  }

  toJSON(): JSONWidget {
    return { type: this.type, options: this.options };
  }
}
window.customElements.define("widget-generic", Widget);

class TimeWidget extends Widget {
  static defaults = {
    "12h": false,
    test_option: null,
  };
  constructor(options: { "12h"?: boolean; test_option?: null } = {}) {
    super(1, options);
  }
}
window.customElements.define("widget-time", TimeWidget);

class DateWidget extends Widget {
  static defaults = {
    format: "normal",
  };
  constructor(
    options: {
      format?: "normal" | "reverse"; // TODO: Replace with proper formatting (%d, %m, %y, etc.)
    } = {}
  ) {
    super(2, options);
  }
}
window.customElements.define("widget-date", DateWidget);

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
insertWidget(new DateWidget().toJSON()); // Create DateWidget object
insertWidget(new TimeWidget().toJSON()); // Create TimeWidget object
insertWidget(new TimeWidget({ "12h": true }).toJSON()); // Create TimeWidget object with options

getStoredWidgets()!.forEach((json: JSONWidget) => {
  let widget: Widget = Widget.fromJSON(json); // Convert stored JSON Object to Widget
  document.body.appendChild(widget); // Show saved objects on page
  console.log("Widget", widget, "\n Type", widget.type, "\n", widget.options); // Print saved objects
});
