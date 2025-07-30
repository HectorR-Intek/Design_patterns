//--------------------- Model ------------------------
class notesModel{
    constructor(){
        const notesFromStorage = localStorage.getItem("notes");
        this.notes = notesFromStorage ? JSON.parse(notesFromStorage) : [];
        this.history = [];
    }
    _commit(newNotes){
        this.history.push(JSON.parse(JSON.stringify(this.notes)));
        this.notes = newNotes;
        localStorage.setItem("notes", JSON.stringify(newNotes));
    }
    addNote(title, content){
        const note = {id: Date.now(), title, content};
        const updatedNotes = [...this.notes, note];
        this._commit(updatedNotes);
        //this.notes.push(note);
    }
    deleteNote(id) {
        const updatedNotes = this.notes.filter(note => note.id !== id);
        this._commit(updatedNotes);
    }
    updateNote(id, newTitle, newContent){
        // updateNotes makes a function for each note  in array of notes (every note)...
        // if ID matches, it changes its title and content to the new ones, if not, just passes them as they are.
        const updateNotes = this.notes.map(note => note.id === id ? {...note, title: newTitle, content: newContent} : note);
        this._commit(updateNotes);
    }
    getNotes(){
        return this.notes;
    }
    undo(){
        if(this.history.length === 0) return false;
        const previous = this.history.pop();
        this.notes = previous;
        localStorage.setItem("notes", JSON.stringify(previous));
        return true;
    }

}



//--------------------- View -------------------------
class notesView{
    constructor(){
        this.form           = document.getElementById("note-form");
        this.titleInput     = document.getElementById("title");
        this.contentInput   = document.getElementById("content");
        this.notesContainer = document.getElementById("notes-container");
        this.searchInput    = document.getElementById('search-input');
        
        
    }

    addNote(id, title, content){
        const noteDiv = document.createElement("div");
        noteDiv.className = "note";
        noteDiv.setAttribute("data-id", id);   // EVEN THOUGH REFERENCED AS ID, THE NAME IS DATA-ID IN THE HTML ELEMENT.
        noteDiv.setAttribute("draggable", "true");

        const noteTitle = document.createElement("strong");
        noteTitle.textContent = title;

        const noteContent = document.createElement("p");
        noteContent.textContent = content;

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'delete-button';

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = "edit-button";

        noteDiv.appendChild(noteTitle);
        noteDiv.appendChild(noteContent);
        noteDiv.appendChild(deleteBtn);
        noteDiv.appendChild(editBtn);

        this.notesContainer.appendChild(noteDiv);
    }

    bindAddNote(callback){
        this.form.addEventListener("submit", event =>{
            event.preventDefault();
            const title = this.titleInput.value.trim();
            const content = this.contentInput.value.trim();
            callback(title, content);
        })
    }

    bindDeleteNote(handler) {
        this.notesContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-button')) {
            const noteDiv = event.target.closest('.note');
            const id = Number(noteDiv.dataset.id);
            handler(id);
            }
        });
    }

    bindEditNote(handler){
        this.notesContainer.addEventListener("click", event =>{
            if(event.target.classList.contains("edit-button")){
                const noteDiv = event.target.closest(".note");
                const id = Number(noteDiv.dataset.id);              // HERE ID is referenced because JS object has ID
                handler(id);                                        // ...but HTML object has data-id
            }
        });
    }

    bindSearch(handler) {
        this.searchInput.addEventListener('input', (event) => {
        const query = event.target.value.toLowerCase();
        handler(query);
        });
    }

    deleteNoteFromDOM(id) {
        const noteDiv = this.notesContainer.querySelector(`[data-id="${id}"]`); // HERE IM NOT SO SURE ABOUT THE NAME
        if (noteDiv) {
            this.notesContainer.removeChild(noteDiv);
        }
    }

    updateNoteInDom(id, title, content){
        const noteDiv = this.notesContainer.querySelector(`[data-id="${id}"]`); //Checks data-id property in HTML element.
        if(!noteDiv) return;

        const titleElem = noteDiv.querySelector("strong");
        const contentElem = noteDiv.querySelector("p");         // Old title and content elements

        if(titleElem) titleElem.textContent = title;
        if(contentElem) contentElem.textContent = content;
    }

    clearNotes() {
        this.notesContainer.innerHTML = '';
    }

    enableDragAndDrop() {
        let draggedElement = null;

        this.notesContainer.addEventListener('dragstart', (event) => {
        draggedElement = event.target.closest('.note');
        event.dataTransfer.effectAllowed = 'move';
        });

        this.notesContainer.addEventListener('dragover', (event) => {
        event.preventDefault();
        const target = event.target.closest('.note');
        if (!target || target === draggedElement) return;
    
        const bounding = target.getBoundingClientRect();
        const offset = event.clientY - bounding.top;
        const shouldInsertBefore = offset < bounding.height / 2;
        if (shouldInsertBefore) {
            this.notesContainer.insertBefore(draggedElement, target);
        } else {
            this.notesContainer.insertBefore(draggedElement, target.nextSibling);
        }
        });

        this.notesContainer.addEventListener('dragend', () => {
        draggedElement = null;
        });

        this.notesContainer.addEventListener('dragend', () => {
            if (this.onDragEndHandler){
                const currentOrder = this.getCurrentOrder();
                this.onDragEndHandler(currentOrder);
            }
        })
    }

    bindUndo(handler) {
        const undoBtn = document.getElementById("undo-button");
        if (undoBtn) {
            undoBtn.addEventListener("click", () => {
                handler();
            });
        }
    }

    bindUndoShortcut(handler) {
        window.addEventListener("keydown", (event) => {
            const ctrlOrCmd = event.ctrlKey;

            if (ctrlOrCmd && event.key.toLowerCase() === "z") {
                event.preventDefault(); // evita interferencias con comportamientos por defecto
                handler();
            }
        });
    }

    bindOnDragEnd(handler){
        this.onDragEndHandler = handler;
    }

    getCurrentOrder(){
        const noteDivs = [...this.notesContainer.querySelectorAll(".note")];
        return noteDivs.map(div => Number(div.dataset.id));
    }
}



//--------------------- Presenter --------------------
class notesPresenter{
    constructor(model, view){
        this.model = model;
        this.view  = view;
        this.editingNoteId = null;

        const notes = this.model.getNotes();
        notes.forEach(note => {
            this.view.addNote(note.id, note.title, note.content);
        });


        this.view.bindAddNote(this.handleAddNote.bind(this));
        this.view.bindDeleteNote(this.handleDeleteNote.bind(this));
        this.view.bindEditNote(this.handleEditNote.bind(this));
        this.view.bindSearch(this.handleSearch.bind(this));
        this.view.enableDragAndDrop();
        this.view.bindUndo(this.handleUndo.bind(this));
        this.view.bindUndoShortcut(this.handleUndo.bind(this));
        this.view.bindOnDragEnd(this.handleReorder.bind(this));

    }

    handleAddNote(title, content){
        if(this.editingNoteId === null){
            this.model.addNote(title, content);
            const notes = this.model.getNotes();
            const lastNote = notes[notes.length - 1];
            this.view.addNote(lastNote.id, lastNote.title, lastNote.content);
        } else{
            this.model.updateNote(this.editingNoteId, title, content);
            this.view.updateNoteInDom(this.editingNoteId, title, content);
            this.editingNoteId = null;
        }
        this.view.form.reset(); // Cleans form after 
    }

    handleDeleteNote(id) {
        this.model.deleteNote(id);
        this.view.deleteNoteFromDOM(id);
    }

    handleEditNote(id){
        const note = this.model.getNotes().find(note => note.id === id);    //finds the ID to edit
        if(!note) return; 

        this.view.form.elements["title"].value = note.title;                // Changes title
        this.view.form.elements["content"].value = note.content;             // and content.

        this.editingNoteId = id;
    }

    handleSearch(query) {
        const filteredNotes = this.model.getNotes().filter(note =>
        note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query)
        );

        this.view.clearNotes();
        filteredNotes.forEach(note => {
        this.view.addNote(note.id, note.title, note.content);
        });
    }

    handleUndo(){
        const undone = this.model.undo();
        if (!undone) return;

        const notes = this.model.getNotes();
        this.view.clearNotes();
        notes.forEach(note => {
            this.view.addNote(note.id, note.title, note.content);
        });
    }
    
    handleReorder(newOrder){
        const notesMap = {};
        this.model.getNotes().forEach(note => {
            notesMap[note.id]= note;

        });
        const reorderedNotes = newOrder.map(id => notesMap[id]);
        this.model._commit(reorderedNotes);
    }

}

const model = new notesModel();
const view = new notesView();
const presenter = new notesPresenter(model, view);