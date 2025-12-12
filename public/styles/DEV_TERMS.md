# Ogeemo Developer Terms Glossary

This document provides simple definitions for common development terms we use while building the Ogeemo app.

---

### **Component**
A reusable, self-contained piece of the user interface (UI). Think of a button, a dialog box, or a contact card. We build pages by combining many components.

### **`<div>` (Division)**
The most basic building block for a webpage's layout. It's an empty container used to group other elements together so they can be styled or positioned as a single unit.

### **Frame**
In our context, this usually refers to a distinct section or container on a page, often enclosed in a `Card` component. For example, the "Your Action Dashboard" is a frame.

### **Kebab Menu**
The three vertical dots (`...`) icon that opens a dropdown menu with more options (like "Edit" or "Delete"). It's called a kebab menu because the dots look like food on a skewer.

### **Padding**
The space *inside* an element, between its content and its border. Increasing padding pushes the content inward, away from the edges.

### **Margin**
The space *outside* an element, pushing it away from other elements around it.

### **Variant**
A predefined style variation of a component. For example, a `Button` can have a `destructive` variant (red) or an `outline` variant (bordered, no fill).

### **Props (Properties)**
The data you pass into a component to configure it. For example, a `Button` component might have a `label` prop to set its text.

### **State**
Data that a component manages internally. When a component's state changes, it re-renders to display the updated information. For example, the text you type into an input field is held in state.

### **CSS (Cascading Style Sheets)**
The language used to describe the presentation of a document written in a markup language like HTML. It controls the colors, fonts, layout, and spacing of all elements.

### **Tailwind CSS**
A utility-first CSS framework that we use in Ogeemo. Instead of writing custom CSS, we apply pre-existing classes directly in the HTML (e.g., `p-4` for padding, `font-bold` for bold text).

### **Dialog / Modal**
A pop-up window that appears on top of the main page content, requiring the user to interact with it before they can return to the main application. Used for forms, confirmations, etc.
