# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('commonapp', '0038_alter_cashentry_entry_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='vehicleusage',
            name='secondary_vehicles',
            field=models.ManyToManyField(
                blank=True,
                help_text='Additional vehicles taken along with the primary vehicle',
                related_name='secondary_usages',
                to='commonapp.vehicle'
            ),
        ),
    ] 