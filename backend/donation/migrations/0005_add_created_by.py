# Generated manually to add created_by field back

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('donation', '0004_remove_created_by'),
        ('users', '0005_alter_admin_user_alter_deliverystaff_user_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='donation',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                db_column='created_by',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='donations',
                to='users.user'
            ),
        ),
    ]

