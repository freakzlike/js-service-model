import cu from '../utils/common'
import { BaseClass } from '../utils/BaseClass'
import { FieldNotBoundException } from '../exceptions/FieldExceptions'
import { FieldDef, FieldBind } from '../types/fields/Field'
import { BaseModel } from '../models'

class Field extends BaseClass {
  /**
   * Field name
   */
  protected _name: (string | null) = null

  /**
   * Field definition
   */
  protected _def: FieldDef

  /**
   * Model instance
   */
  protected _model: BaseModel | null = null

  constructor (def: FieldDef = {}, fieldBind?: FieldBind) {
    super()
    this._def = def
    if (fieldBind) {
      this._name = fieldBind.name
      this._model = fieldBind.model || null
    }
  }

  /**
   * Clone field instance
   */
  public clone (): Field {
    const FieldClass = this.cls as typeof Field

    if (this._name) {
      const fieldBind: FieldBind = {
        name: this._name
      }
      if (this._model) {
        fieldBind.model = this._model
      }

      return new FieldClass(this._def, fieldBind)
    } else {
      return new FieldClass(this._def)
    }
  }

  /**
   * Bind field with field name and return a new instance
   * @param fieldBind
   */
  public bind (fieldBind: FieldBind): Field {
    const FieldClass = this.cls as typeof Field
    return new FieldClass(this._def, fieldBind)
  }

  /**
   * Field name
   */
  public get name (): string {
    if (this._name === null) {
      throw new FieldNotBoundException(this)
    }

    return this._name
  }

  /**
   * Name of attribute in data
   */
  public get attributeName (): string {
    return this._def.attributeName || this.name
  }

  /**
   * Field definition
   */
  public get definition (): FieldDef {
    return this._def
  }

  /**
   * Assigned model
   */
  public get model (): BaseModel {
    if (this._model === null) {
      throw new FieldNotBoundException(this)
    }

    return this._model
  }

  /**
   * Field label
   */
  public get label (): Promise<string> {
    return cu.promiseEval(this._def.label, this)
  }

  /**
   * Field hint
   */
  public get hint (): Promise<string> {
    return cu.promiseEval(this._def.hint, this)
  }

  /**
   * Retrieve value from data structure according to attributeName
   */
  public valueGetter (data: any): any {
    if (!data || typeof data !== 'object') return null

    // No nested attribute name
    if (!this.attributeName.includes('.')) {
      const value = data[this.attributeName]
      return !cu.isNull(value) ? value : null
    }

    // Attribute name contains nested attributes e.g. obj.nested.field
    const subFields = this.attributeName.split('.')
    let currentObject = data
    let subFieldName
    for (subFieldName of subFields) {
      currentObject = currentObject[subFieldName]
      if (cu.isNull(currentObject)) {
        return null
      }
    }

    /* istanbul ignore else */
    if (!cu.isNull(currentObject)) {
      return currentObject
    } else {
      return null
    }
  }
}

export {
  FieldNotBoundException,
  Field
}
