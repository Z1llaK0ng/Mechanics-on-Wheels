#This is a wireframe for the capstone project upon approval.
#A mechanic's bestfriend;
#Allows mechanincs to identify cars through specific years especially after crashes.
    # - Manufacturer (ei. Benz, toyota, nissan etc)
    # - brand (ei. e350, Landcruiser, Patrol etc)
    # - year of manufacture
    # - compatable years (*after identifying the problem)

#Also allows to identify popular problems based on the symptoms given and the other identifiers in the list above.

from identifier import identifyFile, fileInput


def identify():
    def read():
        carDeets = []
        a = input("Manfacturer: ")
        b = input("Model: ")
        c = input("year: ")
    
        if a != '' and b != '':
            carDeets.append(a,b,c)
        
        return carDeets
    
    access = input('Is the VIN available (yes/no)')
    if access == 'yes':
        d = input("VIN(or Chassis number): ") #takes in the vin of a car
        e = fileInput()
        if 5 <= len(d) <= 14:
            identifyFile(d, e)
        
        else:
            d = read()
            

    elif access == 'no':
        d = read()
        e = fileInput()
        

        #use the list from read() in the identifier code
