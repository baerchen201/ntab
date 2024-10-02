window.addEventListener("load", () => {
  document.body.addEventListener("click", () => {
    location.reload();
  });
});

interface Widget {
  type: number;
  options: { [key: string]: string | boolean | number | null };
}

const WidgetTypes: { [key: string]: new () => Widget } = {
  TimeWidget: class implements Widget {
    type = 0;
    options: { "12h": boolean } = { "12h": false };
  },
  DateWidget: class implements Widget {
    type = 1;
    options: { format: "normal" | "switched" | "reverse" } = {
      format: "normal",
    };
  },
};

/**
 * Read widget list from memory as JSON Object
 * If the memory is corrupted, ask user if they want to reset it.
 * @returns The widgets from memory, null if memory is corrupted and the user declines the reset
 */
function getWidgets(): Widget[] | null {
  let json: string | null = localStorage.getItem("widgets");
  try {
    return JSON.parse(json == null ? "[]" : json);
  } catch (e) {
    return window.confirm(
      "An error occurred while reading the saved widgets list.\nWould you like to reset it?"
    )
      ? _setWidgets()
      : null;
  }
}

/**
 * Overwrite the currently saved list of widgets
 * @param widgets List of widgets to save
 * @returns `<widgets>` parameter, useful for chaining calls `console.log(_setWidgets([]))`
 */
function _setWidgets(widgets: Widget[] = []): Widget[] {
  localStorage.setItem("widgets", JSON.stringify(widgets));
  return widgets;
}

/**
 * Remove widget at id `<id>` from memory
 * @param id The widget id to remove
 * @returns The updated list of widgets
 */
function removeWidget(id: number): Widget[] {
  let widgets: Widget[] = getWidgets()!;
  widgets.splice(id, 1);
  return _setWidgets(widgets);
}

/**
 * Save widget to memory at position `<insert>`
 * @param widget The widget object to save
 * @param insert The position at which to insert the widget, default -1 (last)
 * @returns The updated list of widgets
 */
function addWidget(widget: Widget, insert?: number): Widget[] {
  let widgets: Widget[] = getWidgets()!;
  if (insert == undefined) widgets.push(widget);
  else widgets.splice(insert, 0, widget);
  return _setWidgets(widgets);
}

/**
 * Create a Widget Object for use with `addWidget`
 * @param type The type of widget to create (see `WidgetTypes`)
 * @param options The init options of the widget
 * @returns The created widget
 */
function createWidgetObject(
  type: string,
  options?: { [key: string]: string | boolean | number | null }
): Widget {
  let widget: Widget = new WidgetTypes[type]();
  if (options)
    Object.keys(widget.options).forEach((key) => {
      if (Object.keys(options).includes(key))
        widget.options[key] = options[key];
    });
  return widget;
}

_setWidgets(); // Clear stored widget memory
addWidget(createWidgetObject("DateWidget")); // Create DateWidget object
addWidget(createWidgetObject("TimeWidget")); // Create TimeWidget object
addWidget(createWidgetObject("TimeWidget", { "12h": true })); // Create TimeWidget object with options
console.log(getWidgets()); // Print saved objects
