
TODO:
* Make better link chips, incorporating delete button better
* Node cards: 
   - Link Node to other Existing Node
     * Started on this.  TODO: Convert chip list to link type select followed by dropdown select 
   - Link Node to newly created Node
     * Add this to above UI.  Selecting "New Node" instead of suggested nodes should show an AddNode card for the appropriate type
     * Prepopulate created node types based on other links from nodes of same type (e.g. if :Person-[:WorksFor]->:Organization then adding a :WorksFor link should show the creation card for :Organization)
     * Example: Adding a note to someone
    
* UI: 
 - Tabs for People, Orgs, etc.

* Way to "explore" the graph.  (Force layout?  Browser "pages"?)
* Collection cards: Pagination