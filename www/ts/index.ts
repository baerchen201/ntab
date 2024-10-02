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

function _setWidgets(widgets: Widget[] = []): Widget[] {
  localStorage.setItem("widgets", JSON.stringify(widgets));
  return widgets;
}

function removeWidget(id: number): Widget[] {
  let widgets: Widget[] = getWidgets()!;
  widgets.splice(id, 1);
  return _setWidgets(widgets);
}

function addWidget(widget: Widget, insert?: number) {
  let widgets: Widget[] = getWidgets()!;
  if (insert == undefined) widgets.push(widget);
  else widgets.splice(insert, 0, widget);
  return _setWidgets(widgets);
}

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
